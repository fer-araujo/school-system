import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";

export class ProcessAttendanceScan {
  private employeeRepo: EmployeeRepository;
  private attendanceRepo: AttendanceRepository;
  private shiftRepo: ShiftRepository;
  private calendarRepo: CalendarRepository;
  private absenceRepo: AbsenceRepository;
  constructor(
    employeeRepo: EmployeeRepository,
    attendanceRepo: AttendanceRepository,
    shiftRepo: ShiftRepository,
    calendarRepo: CalendarRepository,
    absenceRepo: AbsenceRepository,
  ) {
    this.employeeRepo = employeeRepo;
    this.attendanceRepo = attendanceRepo;
    this.shiftRepo = shiftRepo;
    this.calendarRepo = calendarRepo;
    this.absenceRepo = absenceRepo;
  }

  async execute(scannedData: string) {
    const rawInput = scannedData.trim();
    if (!rawInput) throw new Error("Gafete vacío o lectura incorrecta.");

    let user = await this.employeeRepo.getWorkerByBadgeId(rawInput);
    if (!user)
      user = await this.employeeRepo.getWorkerByEmployeeNumber(rawInput);

    if (!user) {
      try {
        const parsed = JSON.parse(rawInput);
        user = await this.employeeRepo.getWorkerById(parsed.uid);
      } catch {
        user = await this.employeeRepo.getWorkerById(rawInput);
      }
    }

    if (!user) throw new Error("Gafete no reconocido.");
    if (!user.isActive) throw new Error("Acceso denegado: Empleado de baja.");

    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offsetMs);
    const todayStr = localNow.toISOString().split("T")[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Validaciones de calendario
    const holiday = await this.calendarRepo.getHolidayByDate(todayStr);
    if (holiday)
      throw new Error(`Bloqueado: Hoy es festivo (${holiday.name}).`);

    const userAbsence = await this.absenceRepo.getAbsenceForUserAndDate(
      user.id,
      todayStr,
    );
    if (userAbsence)
      throw new Error(
        `Acceso denegado: Tienes un permiso (${userAbsence.type}).`,
      );

    // Deducir entrada/salida
    const todayAttendances =
      await this.attendanceRepo.getAttendancesByDate(todayStr);
    const myAttendance = todayAttendances.find((a) => a.userId === user!.id);
    let isEntryFallback = true;
    let periodIndex = 0;

    if (myAttendance?.periods && myAttendance.periods.length > 0) {
      const lastPeriod = myAttendance.periods[myAttendance.periods.length - 1];
      if (!lastPeriod.checkOut) {
        isEntryFallback = false;
        periodIndex = myAttendance.periods.length - 1;
      } else {
        periodIndex = myAttendance.periods.length;
      }
    }

    const finalType = isEntryFallback ? "ENTRY" : "EXIT";
    let isLate = false;
    let skippedBlocks = 0;

    if (finalType === "ENTRY") {
      const assignment = await this.shiftRepo.getActiveAssignmentForUser(
        user.id,
        todayStr,
      );
      const activeShiftId = assignment ? assignment.shiftId : user.shiftId;

      if (!activeShiftId) throw new Error("No tienes un turno asignado.");

      const shift = await this.shiftRepo.getShiftById(activeShiftId);
      if (!shift) throw new Error("El turno asignado no existe.");

      // 🌟 LÓGICA DE DÍAS FLEXIBLES
      const daysTranslation: Record<number, string> = {
        0: "Domingo",
        1: "Lunes",
        2: "Martes",
        3: "Miércoles",
        4: "Jueves",
        5: "Viernes",
        6: "Sábado",
      };
      const todayName = daysTranslation[now.getDay()];

      if (!shift.workDays.includes(todayName)) {
        throw new Error(`Hoy (${todayName}) es tu día de descanso.`);
      }

      // 🌟 OBTENER BLOQUES DE HOY
      const blocks = shift.blocksByDay ? shift.blocksByDay[todayName] : [];
      if (!blocks || blocks.length === 0)
        throw new Error(`No hay horarios configurados para el ${todayName}.`);

      let targetBlockIndex = -1;
      for (let i = 0; i < blocks.length; i++) {
        const [endHour, endMin] = blocks[i].end.split(":").map(Number);
        if (currentMinutes <= endHour * 60 + endMin) {
          targetBlockIndex = i;
          break;
        }
      }

      if (targetBlockIndex !== -1) {
        if (targetBlockIndex > periodIndex) {
          skippedBlocks = targetBlockIndex - periodIndex;
        } else if (targetBlockIndex < periodIndex) {
          throw new Error("Desajuste de turnos. Contacta a administración.");
        }

        const [startHour, startMin] = blocks[targetBlockIndex].start
          .split(":")
          .map(Number);
        if (
          currentMinutes >
          startHour * 60 + startMin + (shift.toleranceMinutes || 0)
        ) {
          isLate = true;
        }
      } else {
        const lastBlock = blocks[blocks.length - 1];
        throw new Error(`Tu turno finalizó a las ${lastBlock.end}.`);
      }
    }

    await this.attendanceRepo.recordScan(
      user.id,
      user.employeeNumber || "0000",
      todayStr,
      finalType,
      now,
      isLate,
      skippedBlocks,
    );

    return {
      employeeName: user.fullName,
      time: now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isLate,
      type: finalType,
      skippedBlocks,
    };
  }
}
