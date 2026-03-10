import { db } from "../firebase/config";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import type {
  AttendanceStatus,
  AttendanceWithWorker,
  WorkPeriod,
} from "../../domain/models/User";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";

// Definición estricta para el manejo de datos crudos de Firebase
interface FirestoreWorkPeriod {
  checkIn: Date | Timestamp | null;
  checkOut?: Date | Timestamp | null;
  isLate?: boolean;
  isAbsent?: boolean;
}

export class FirebaseAttendanceRepository implements AttendanceRepository {
  async recordScan(
    userId: string,
    employeeNumber: string,
    date: string,
    type: "ENTRY" | "EXIT",
    time: Date,
    isLate: boolean = false,
    skippedBlocks: number = 0,
  ): Promise<void> {
    const docId = `${userId}_${date}`;
    const docRef = doc(db, "attendance", docId);
    const docSnap = await getDoc(docRef);

    let periods: FirestoreWorkPeriod[] = []; // O usa tu interface FirestoreWorkPeriod
    let status = "PRESENT";

    if (docSnap.exists()) {
      const data = docSnap.data();
      periods = data.periods || [];
    }

    if (type === "ENTRY") {
      const lastPeriod = periods[periods.length - 1];
      // Modificamos la validación para ignorar los bloques que son faltas
      if (lastPeriod && !lastPeriod.checkOut && !lastPeriod.isAbsent) {
        throw new Error(
          "Doble entrada denegada: Ya registraste una entrada y no has marcado salida.",
        );
      }

      // 🚨 LA MAGIA: Rellenar los bloques que se saltó con FALTAS
      for (let i = 0; i < skippedBlocks; i++) {
        periods.push({
          isAbsent: true,
          checkIn: null,
          checkOut: null,
        });
      }

      // Después de rellenar las faltas, ahora sí guardamos su entrada real
      periods.push({ checkIn: time, isLate });
      status = "PRESENT";
    }

    if (type === "EXIT") {
      // ... (Tu código de EXIT se queda exactamente igual) ...
      if (periods.length === 0) {
        throw new Error(
          "Salida denegada: No tienes ninguna entrada registrada hoy.",
        );
      }
      const lastPeriodIndex = periods.length - 1;
      if (periods[lastPeriodIndex].checkOut) {
        throw new Error("Doble salida denegada: Ya cerraste tu último turno.");
      }
      periods[lastPeriodIndex].checkOut = time;
      status = "COMPLETED";
    }

    await setDoc(
      docRef,
      { userId, employeeNumber, date, periods, status },
      { merge: true },
    );
  }

  async getAttendancesByDate(date: string): Promise<AttendanceWithWorker[]> {
    const q = query(collection(db, "attendance"), where("date", "==", date));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersMap = new Map<string, string>();
    usersSnapshot.forEach((userDoc) => {
      usersMap.set(
        userDoc.id,
        userDoc.data().fullName || "Usuario Desconocido",
      );
    });

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const rawPeriods = (data.periods as FirestoreWorkPeriod[]) || [];

      // Mapeo seguro y estricto asegurando que devolvemos Date nativo de JS
      const mappedPeriods: WorkPeriod[] = rawPeriods.map((p) => ({
        checkIn:
          p.checkIn instanceof Timestamp
            ? p.checkIn.toDate()
            : (p.checkIn as Date),
        checkOut:
          p.checkOut instanceof Timestamp
            ? p.checkOut.toDate()
            : p.checkOut
              ? (p.checkOut as Date)
              : undefined,
        isLate: p.isLate || false,
      }));

      return {
        id: doc.id,
        employeeNumber: data.employeeNumber as string,
        userId: data.userId as string,
        date: data.date as string,
        periods: mappedPeriods,
        status: data.status as AttendanceStatus,
        workerName: usersMap.get(data.userId as string) || "Desconocido",
      };
    });
  }

  async getAttendancesByDateRange(
    start: string,
    end: string,
  ): Promise<AttendanceWithWorker[]> {
    const q = query(
      collection(db, "attendance"),
      where("date", ">=", start),
      where("date", "<=", end),
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    // Mismo mapeo que ya usas en tus otras funciones
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const rawPeriods = (data.periods as FirestoreWorkPeriod[]) || [];
      const mappedPeriods: WorkPeriod[] = rawPeriods.map((p) => ({
        checkIn:
          p.checkIn instanceof Timestamp
            ? p.checkIn.toDate()
            : (p.checkIn as Date),
        checkOut:
          p.checkOut instanceof Timestamp
            ? p.checkOut.toDate()
            : p.checkOut
              ? (p.checkOut as Date)
              : undefined,
        isLate: p.isLate || false,
      }));

      return {
        id: doc.id,
        employeeNumber: data.employeeNumber as string,
        userId: data.userId as string,
        date: data.date as string,
        periods: mappedPeriods,
        status: data.status as AttendanceStatus,
        workerName: data.workerName || "Desconocido",
      };
    });
  }

  listenToAttendancesByDateRange(
    start: string,
    end: string,
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void {
    const q = query(
      collection(db, "attendance"),
      where("date", ">=", start),
      where("date", "<=", end),
    );

    // onSnapshot es la magia de Firebase para el tiempo real
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }

      // Traemos los nombres de los usuarios (Para un sistema gigante esto se cachea, pero aquí funciona perfecto)
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersMap = new Map<string, string>();
      usersSnapshot.forEach((userDoc) => {
        usersMap.set(
          userDoc.id,
          userDoc.data().fullName || "Usuario Desconocido",
        );
      });

      const records = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawPeriods = (data.periods as FirestoreWorkPeriod[]) || [];

        const mappedPeriods: WorkPeriod[] = rawPeriods.map((p) => ({
          checkIn:
            p.checkIn instanceof Timestamp
              ? p.checkIn.toDate()
              : (p.checkIn as Date),
          checkOut:
            p.checkOut instanceof Timestamp
              ? p.checkOut.toDate()
              : p.checkOut
                ? (p.checkOut as Date)
                : undefined,
          isLate: p.isLate || false,
        }));

        return {
          id: doc.id,
          userId: data.userId as string,
          employeeNumber: data.employeeNumber as string,
          date: data.date as string,
          periods: mappedPeriods,
          status: data.status as AttendanceStatus,
          workerName: usersMap.get(data.userId as string) || "Desconocido",
        };
      });

      // Le avisamos a React que hay datos nuevos!
      callback(records);
    });

    // Retornamos la función para "apagar" el micrófono cuando el admin cambie de pestaña
    return unsubscribe;
  }
}
