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
} from "firebase/firestore";
import type {
  AttendanceStatus,
  AttendanceWithWorker,
  WorkPeriod,
} from "../../domain/models/User";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";

// Definición estricta para el manejo de datos crudos de Firebase
interface FirestoreWorkPeriod {
  checkIn: Date | Timestamp;
  checkOut?: Date | Timestamp;
  isLate?: boolean;
}

export class FirebaseAttendanceRepository implements AttendanceRepository {
  async recordScan(
    userId: string,
    date: string,
    type: "ENTRY" | "EXIT",
    time: Date,
    isLate: boolean = false,
  ): Promise<void> {
    const docId = `${userId}_${date}`;
    const docRef = doc(db, "attendance", docId);
    const docSnap = await getDoc(docRef);

    let periods: FirestoreWorkPeriod[] = [];
    let status: AttendanceStatus = "PRESENT";

    if (docSnap.exists()) {
      const data = docSnap.data();
      periods = (data.periods as FirestoreWorkPeriod[]) || [];
    }

    if (type === "ENTRY") {
      const lastPeriod = periods[periods.length - 1];
      if (lastPeriod && !lastPeriod.checkOut) {
        throw new Error(
          "Doble entrada denegada: Ya registraste una entrada y no has marcado salida.",
        );
      }
      // GUARDAMOS SI LLEGÓ TARDE
      periods.push({ checkIn: time, isLate });
      status = "PRESENT";
    }

    if (type === "EXIT") {
      if (periods.length === 0) {
        throw new Error(
          "Salida denegada: No tienes ninguna entrada registrada hoy.",
        );
      }

      const lastPeriodIndex = periods.length - 1;
      const lastPeriod = periods[lastPeriodIndex];

      if (lastPeriod.checkOut) {
        throw new Error("Doble salida denegada: Ya cerraste tu último turno.");
      }

      periods[lastPeriodIndex].checkOut = time;
      status = "COMPLETED";
    }

    await setDoc(docRef, { userId, date, periods, status }, { merge: true });
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
        userId: data.userId as string,
        date: data.date as string,
        periods: mappedPeriods,
        status: data.status as AttendanceStatus,
        workerName: usersMap.get(data.userId as string) || "Desconocido",
      };
    });
  }
}
