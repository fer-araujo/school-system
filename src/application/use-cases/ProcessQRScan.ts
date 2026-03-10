import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import { ProcessAttendanceScan } from "./ProcessAttendance";
export class ProcessQRScan {
  private processAttendanceScan: ProcessAttendanceScan;

  constructor(
    employeeRepo: EmployeeRepository,
    attendanceRepo: AttendanceRepository,
    calendarRepo: CalendarRepository,
    absenceRepo: AbsenceRepository,
    shiftRepo: ShiftRepository,
  ) {
    // Reutilizamos el cerebro principal para no duplicar código
    this.processAttendanceScan = new ProcessAttendanceScan(
      employeeRepo,
      attendanceRepo,
      shiftRepo,
      calendarRepo,
      absenceRepo,
    );
  }

  async execute(rawQrString: string): Promise<string> {
    try {
      // Usamos el lector principal de Gafetes
      const result = await this.processAttendanceScan.execute(rawQrString);

      const statusMsg = result.type === "ENTRY" ? "Entrada" : "Salida";
      return `Éxito: ${statusMsg} registrada. ${result.isLate ? "(Con Retardo)" : ""}`;
    } catch (error: unknown) {
      if (error instanceof Error) throw error;
      throw new Error("Error desconocido al escanear gafete.");
    }
  }
}
