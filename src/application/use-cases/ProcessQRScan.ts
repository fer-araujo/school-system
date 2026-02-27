import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { QRPayload } from "../../domain/logic/QRPayloadBuilder";
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
      if (!payload.uid || !payload.date || !payload.type)
        throw new Error("QR inválido.");

      const today = new Date().toLocaleDateString("en-CA");

      // 1. Validar Feriados
      const holiday = await this.calendarRepo.getHolidayByDate(today);
      if (holiday) throw new Error(`Bloqueado: Hoy es ${holiday.reason}.`);

      // 2. Validar Incapacidades
      const userAbsence = await this.absenceRepo.getAbsenceForUserAndDate(
        payload.uid,
        today,
      );
      if (userAbsence)
        throw new Error(
          `Acceso denegado: Estás de ${userAbsence.type === "VACATION" ? "Vacaciones" : "Incapacidad"}.`,
        );

      // 3. Validar QR Caducado
      if (payload.date !== today) throw new Error("QR Caducado.");

      // --- 4. NUEVA LÓGICA: CÁLCULO DE RETARDOS ---
      let isLate = false;
      const now = new Date();

      if (payload.type === "ENTRY") {
        const assignment = await this.shiftRepo.getActiveAssignmentForUser(
          payload.uid,
          today,
        );
        if (assignment) {
          const shift = await this.shiftRepo.getShiftById(assignment.shiftId);
          if (shift && shift.blocks.length > 0) {
            // A) Encontrar el bloque horario más cercano a la hora actual
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

            // B) Calcular si llegó tarde al bloque más cercano
            const [h, m] = closestBlock.start.split(":").map(Number);
            const blockStart = new Date();
            blockStart.setHours(h, m, 0, 0);

            const toleranceMs = 10 * 60 * 1000; // 10 Minutos de gracia

            if (now.getTime() > blockStart.getTime() + toleranceMs) {
              isLate = true; // ¡Retardo detectado!
            }
          }
        }
      }
      // ---------------------------------------------

      // 5. Guardar Asistencia mandando el estado del retardo
      await this.attendanceRepo.recordScan(
        payload.uid,
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
