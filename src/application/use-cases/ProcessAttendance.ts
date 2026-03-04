import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../../infrastructure/firebase/config";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { Shift } from "../../domain/models/Shift";

export class ProcessAttendanceScan {
  private attendanceRepo: AttendanceRepository;

  constructor(attendanceRepo: AttendanceRepository) {
    this.attendanceRepo = attendanceRepo;
  }

  async execute(scannedData: string) {
    const rawInput = scannedData.trim();
    if (!rawInput) throw new Error("Código vacío");

    let actualUserId = rawInput;
    let qrRequestedType: "ENTRY" | "EXIT" | null = null;
    
    // REGLA 1: En vez de 'any', usamos el tipo oficial de Firebase para documentos
    let userData: DocumentData | null = null; 

    // 1. DESCIFRAR EL MENSAJE
    try {
      const parsedData = JSON.parse(rawInput);
      if (parsedData.uid) {
        actualUserId = parsedData.uid; 
        qrRequestedType = parsedData.type as "ENTRY" | "EXIT"; 
      }
    } catch {
      // Si explota el JSON.parse, no pasa nada. Asumimos que la administradora tecleó a mano.
    }

    // 2. BUSCAR AL EMPLEADO EN FIREBASE
    const userRef = doc(db, "users", actualUserId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      userData = userSnap.data();
    } else {
      // Búsqueda híbrida: Si el ID falló, buscamos por número de empleado.
      const q = query(
        collection(db, "users"),
        where("employeeNumber", "==", actualUserId),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Empleado no encontrado. Verifica el código o gafete.");
      }
      userData = querySnapshot.docs[0].data();
      actualUserId = querySnapshot.docs[0].id; // Rescatamos el ID real de Firebase
    }

    if (userData.isActive === false) {
      throw new Error("El empleado está dado de baja.");
    }

    // 3. FECHAS LOCALES
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 4. HISTORIAL DE HOY (Para saber en qué bloque del turno va)
    const attendanceRef = doc(db, "attendance", `${actualUserId}_${dateStr}`);
    const attSnap = await getDoc(attendanceRef);

    let isEntryFallback = true;
    let periodIndex = 0;

    if (attSnap.exists()) {
      const attData = attSnap.data();
      const periods = attData.periods || [];
      periodIndex = periods.length;

      if (periods.length > 0) {
        const lastPeriod = periods[periods.length - 1];
        if (!lastPeriod.checkOut) {
          isEntryFallback = false; // Ya tiene entrada sin salida, el sistema deduce que le toca salir
          periodIndex = periods.length - 1;
        }
      }
    }

    // EL GRAN CRUCE: Le hacemos caso al QR si lo trae. Si fue manual, el sistema deduce qué toca.
    const finalType = qrRequestedType || (isEntryFallback ? "ENTRY" : "EXIT");

    // 5. CALCULAR RETARDO (Solo si es Entrada)
    let isLate = false;
    if (finalType === "ENTRY") {
      try {
        const assignmentsQ = query(
          collection(db, "shift_assignments"),
          where("userId", "==", actualUserId),
        );
        const assignmentsSnap = await getDocs(assignmentsQ);

        if (!assignmentsSnap.empty) {
          const activeShiftId = assignmentsSnap.docs[0].data().shiftId;
          const shiftSnap = await getDoc(doc(db, "shifts", activeShiftId));

          if (shiftSnap.exists()) {
            const shiftData = shiftSnap.data() as Shift;
            const blocks = shiftData.blocks || [];
            const tolerance = shiftData.toleranceMinutes || 0;

            if (blocks[periodIndex]) {
              const block = blocks[periodIndex];
              const [startHour, startMin] = block.start.split(":").map(Number);
              const expectedStartMinutes = startHour * 60 + startMin;

              if (currentMinutes > expectedStartMinutes + tolerance) {
                isLate = true;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error calculando retardo:", error);
      }
    }

    // 6. GUARDAR EN FIREBASE (Tu viejo y confiable repositorio)
    await this.attendanceRepo.recordScan(
      actualUserId,
      dateStr,
      finalType,
      now,
      isLate,
    );

    return {
      employeeName: userData.fullName || "Empleado",
      time: now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isLate,
      type: finalType,
    };
  }
}
