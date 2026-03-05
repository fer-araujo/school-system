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

    // 5. CALCULAR RETARDO Y BLOQUES SALTADOS
    let isLate = false;
    let skippedBlocks = 0; // <--- NUEVO CONTADOR

    if (finalType === "ENTRY") {
      try {
        let activeShiftId = userData.shiftId;
        if (!activeShiftId) {
          const assignSnap = await getDoc(
            doc(db, "shift_assignments", `assign_${actualUserId}`),
          );
          if (assignSnap.exists()) activeShiftId = assignSnap.data().shiftId;
        }

        if (activeShiftId) {
          const shiftSnap = await getDoc(doc(db, "shifts", activeShiftId));

          if (shiftSnap.exists()) {
            const shiftData = shiftSnap.data() as Shift;
            const blocks = shiftData.blocks || [];
            const tolerance = shiftData.toleranceMinutes || 0;

            if (blocks.length === 0)
              throw new Error("Acceso denegado: El turno no tiene horarios.");

            let targetBlockIndex = -1;

            // Buscamos en qué bloque estamos según el reloj
            for (let i = 0; i < blocks.length; i++) {
              const [endHour, endMin] = blocks[i].end.split(":").map(Number);
              const expectedEndMinutes = endHour * 60 + endMin;

              if (currentMinutes <= expectedEndMinutes) {
                targetBlockIndex = i;
                break;
              }
            }

            if (targetBlockIndex !== -1) {
              // 🚨 CÁLCULO DE FALTAS ANTERIORES
              if (targetBlockIndex > periodIndex) {
                // Si le toca el bloque 1, pero tiene 0 registros, saltó 1 bloque.
                skippedBlocks = targetBlockIndex - periodIndex;
              } else if (targetBlockIndex < periodIndex) {
                throw new Error(
                  "Desajuste de turnos. Contacta a administración.",
                );
              }

              const targetBlock = blocks[targetBlockIndex];
              const [startHour, startMin] = targetBlock.start
                .split(":")
                .map(Number);
              const expectedStartMinutes = startHour * 60 + startMin;

              // Revisamos si llegó tarde al bloque que SÍ le toca
              if (currentMinutes > expectedStartMinutes + tolerance) {
                isLate = true;
              }
            } else {
              const lastBlock = blocks[blocks.length - 1];
              throw new Error(
                `Acceso denegado: Tu turno finalizó a las ${lastBlock.end}.`,
              );
            }
          } else {
            throw new Error("Acceso denegado: El turno fue eliminado.");
          }
        } else {
          throw new Error("Acceso denegado: No tienes un turno asignado.");
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("Acceso denegado"))
          throw error;
      }
    }

    // 6. GUARDAR EN FIREBASE (Enviamos los bloques saltados)
    await this.attendanceRepo.recordScan(
      actualUserId,
      userData.employeeNumber || "0000",
      dateStr,
      finalType,
      now,
      isLate,
      skippedBlocks, // <--- LE PASAMOS EL DATO AL REPO
    );

    // 7. DEVOLVEMOS EL MENSAJE PARA EL KIOSCO
    return {
      employeeName: userData.fullName || "Empleado",
      time: now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isLate,
      type: finalType,
      skippedBlocks, // <--- Enviamos esto a la vista
    };
  }
}
