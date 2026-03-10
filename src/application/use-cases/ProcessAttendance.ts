import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";

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

    // 1. BUSCAR AL EMPLEADO POR GAFETE (O por número si se teclea manual)
    let user = await this.employeeRepo.getWorkerByBadgeId(rawInput);
    if (!user) {
      user = await this.employeeRepo.getWorkerByEmployeeNumber(rawInput);
    }

    // Soporte legacy por si alguien escanea el UID de sistema o el viejo JSON temporalmente
    if (!user) {
      try {
        const parsed = JSON.parse(rawInput);
        user = await this.employeeRepo.getWorkerById(parsed.uid);
      } catch {
        user = await this.employeeRepo.getWorkerById(rawInput);
      }
    }

    if (!user) throw new Error("Gafete no reconocido en el sistema.");
    if (!user.isActive)
      throw new Error("Acceso denegado: El empleado está dado de baja.");

    // 2. FECHAS LOCALES
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offsetMs);
    const todayStr = localNow.toISOString().split("T")[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 3. VALIDAR FESTIVOS Y PERMISOS
    const holiday = await this.calendarRepo.getHolidayByDate(todayStr);
    if (holiday)
      throw new Error(`Bloqueado: Hoy es día festivo (${holiday.name}).`);

    const userAbsence = await this.absenceRepo.getAbsenceForUserAndDate(
      user.id,
      todayStr,
    );
    if (userAbsence) {
      throw new Error(
        `Acceso denegado: Tienes un permiso activo (${userAbsence.type}).`,
      );
    }

    // 4. HISTORIAL DE HOY (Deducir Entrada o Salida)
    const todayAttendances =
      await this.attendanceRepo.getAttendancesByDate(todayStr);
    const myAttendance = todayAttendances.find((a) => a.userId === user!.id);

    let isEntryFallback = true;
    let periodIndex = 0;

    if (myAttendance) {
      const periods = myAttendance.periods || [];
      periodIndex = periods.length;

      if (periods.length > 0) {
        const lastPeriod = periods[periods.length - 1];
        if (!lastPeriod.checkOut) {
          isEntryFallback = false; // Tiene entrada sin salida, toca salir.
          periodIndex = periods.length - 1;
        }
      }
    }

    const finalType = isEntryFallback ? "ENTRY" : "EXIT";

    // 5. CÁLCULO DE TURNOS, RETARDOS Y BLOQUES SALTADOS
    let isLate = false;
    let skippedBlocks = 0;

    if (finalType === "ENTRY") {
      const assignment = await this.shiftRepo.getActiveAssignmentForUser(
        user.id,
        todayStr,
      );
      const activeShiftId = assignment ? assignment.shiftId : user.shiftId;

      if (!activeShiftId)
        throw new Error("Acceso denegado: No tienes un turno asignado hoy.");

      const shift = await this.shiftRepo.getShiftById(activeShiftId);
      if (!shift || !shift.blocks || shift.blocks.length === 0) {
        throw new Error(
          "Acceso denegado: El turno está vacío o fue eliminado.",
        );
      }

      const dateObj = new Date(todayStr + "T12:00:00");
      const targetDayId = WEEK_DAYS[dateObj.getDay()].id;

      if (!shift.workDays.includes(targetDayId)) {
        throw new Error("Acceso denegado: Hoy es tu día de descanso.");
      }

      let targetBlockIndex = -1;
      for (let i = 0; i < shift.blocks.length; i++) {
        const [endHour, endMin] = shift.blocks[i].end.split(":").map(Number);
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

        const [startHour, startMin] = shift.blocks[targetBlockIndex].start
          .split(":")
          .map(Number);
        if (
          currentMinutes >
          startHour * 60 + startMin + (shift.toleranceMinutes || 0)
        ) {
          isLate = true;
        }
      } else {
        const lastBlock = shift.blocks[shift.blocks.length - 1];
        throw new Error(
          `Acceso denegado: Tu turno finalizó a las ${lastBlock.end}.`,
        );
      }
    }

    // 6. GUARDAR EN BD
    await this.attendanceRepo.recordScan(
      user.id,
      user.employeeNumber || "0000",
      todayStr,
      finalType,
      now,
      isLate,
      skippedBlocks,
    );

    // 7. RESPUESTA AL KIOSCO
    return {
      employeeName: user.fullName || "Empleado",
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
