import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { QRPayload } from "../../domain/logic/QRPayloadBuilder"; // Asumo que lo tienes aquí
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";

export class ProcessQRScan {
  private attendanceRepo: AttendanceRepository;
  private calendarRepo: CalendarRepository;
  private absenceRepo: AbsenceRepository;
  private shiftRepo: ShiftRepository;

  constructor(
    attendanceRepo: AttendanceRepository,
    calendarRepo: CalendarRepository,
    absenceRepo: AbsenceRepository,
    shiftRepo: ShiftRepository,
  ) {
    this.attendanceRepo = attendanceRepo;
    this.calendarRepo = calendarRepo;
    this.absenceRepo = absenceRepo;
    this.shiftRepo = shiftRepo;
  }

  async execute(rawQrString: string): Promise<string> {
    try {
      const payload = JSON.parse(rawQrString) as QRPayload;

      // 1. Validar que vengan todos los datos
      if (
        !payload.uid ||
        !payload.emp ||
        !payload.date ||
        !payload.type ||
        !payload.t
      ) {
        throw new Error("QR inválido o formato incorrecto.");
      }

      const now = new Date();

      // --- 2. ESCUDO ANTI-TRAMPAS ---
      const qrAgeInSeconds = (now.getTime() - payload.t) / 1000;
      if (qrAgeInSeconds > 60) {
        throw new Error(
          "QR Expirado. Por seguridad, el código dura 60 segundos. Genera uno nuevo.",
        );
      }

      const today = now.toLocaleDateString("en-CA");

      // 3. Validar QR del día correcto
      if (payload.date !== today)
        throw new Error("QR Caducado (Fecha de otro día).");

      // 4. Validar Feriados (CORREGIDO: holiday.name en lugar de holiday.reason)
      const holiday = await this.calendarRepo.getHolidayByDate(today);
      if (holiday) throw new Error(`Bloqueado: Hoy es ${holiday.name}.`);

      // 5. Validar Incapacidades
      const userAbsence = await this.absenceRepo.getAbsenceForUserAndDate(
        payload.uid,
        today,
      );
      if (userAbsence) {
        throw new Error(
          `Acceso denegado: Estás de ${userAbsence.type === "Vacaciones" ? "Vacaciones" : "Incapacidad"}.`,
        );
      }

      // --- 6. LÓGICA DE TURNOS Y RETARDOS ---
      let isLate = false;

      if (payload.type === "ENTRY") {
        const assignment = await this.shiftRepo.getActiveAssignmentForUser(
          payload.uid,
          today,
        );

        if (assignment) {
          const shift = await this.shiftRepo.getShiftById(assignment.shiftId);
          if (shift && shift.blocks.length > 0) {
            // A) Encontrar el bloque horario más cercano
            let closestBlock = shift.blocks[0];
            let minDiff = Infinity;

            shift.blocks.forEach((block) => {
              const [h, m] = block.start.split(":").map(Number);
              const blockDate = new Date();
              blockDate.setHours(h, m, 0, 0);

              const diff = Math.abs(now.getTime() - blockDate.getTime());
              if (diff < minDiff) {
                minDiff = diff;
                closestBlock = block;
              }
            });

            // B) Calcular retardo
            const [h, m] = closestBlock.start.split(":").map(Number);
            const blockStart = new Date();
            blockStart.setHours(h, m, 0, 0);

            const toleranceMs = 10 * 60 * 1000; // 10 Minutos

            if (now.getTime() > blockStart.getTime() + toleranceMs) {
              isLate = true;
            }
          }
        }
      }

      // 7. Guardar Asistencia (CORREGIDO: Agregado payload.emp como segundo parámetro)
      await this.attendanceRepo.recordScan(
        payload.uid,
        payload.emp,
        payload.date,
        payload.type,
        now,
        isLate,
      );

      const statusMsg = payload.type === "ENTRY" ? "Entrada" : "Salida";
      return `Éxito: ${statusMsg} registrada. ${isLate ? "(Con Retardo)" : ""}`;
    } catch (error: unknown) {
      if (error instanceof SyntaxError)
        throw new Error("Código ajeno al sistema.");
      if (error instanceof Error) throw error;
      throw new Error("Error desconocido al procesar.");
    }
  }
}
