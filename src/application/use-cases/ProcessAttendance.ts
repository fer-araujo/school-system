import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ScheduleAnomaly } from "../../domain/models/User";
import { ScanRejectedError } from "../../domain/errors/ScanRejectedError";
import { MIN_PERIOD_MINUTES } from "../../domain/constants/attendanceRules";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";
import {
  minutesSinceMidnight,
  parseTimeToMinutes,
  todayLocalISO,
} from "../../domain/logic/dateTime";

const formatClock = (date: Date) =>
  date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

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
    if (!rawInput)
      throw new ScanRejectedError(
        "EMPTY_BADGE",
        "Gafete vacío o lectura incorrecta.",
      );

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

    if (!user)
      throw new ScanRejectedError(
        "BADGE_NOT_RECOGNIZED",
        "Gafete no reconocido.",
      );
    if (!user.isActive)
      throw new ScanRejectedError(
        "EMPLOYEE_INACTIVE",
        "Acceso denegado: Empleado de baja.",
      );

    const now = new Date();
    const todayStr = todayLocalISO(now);
    const currentMinutes = minutesSinceMidnight(now);

    // Validaciones de calendario
    const holiday = await this.calendarRepo.getHolidayByDate(todayStr);
    if (holiday)
      throw new ScanRejectedError(
        "HOLIDAY",
        `Bloqueado: Hoy es festivo (${holiday.name}).`,
        { holidayName: holiday.name },
      );

    const userAbsence = await this.absenceRepo.getAbsenceForUserAndDate(
      user.id,
      todayStr,
    );
    if (userAbsence)
      throw new ScanRejectedError(
        "ON_LEAVE",
        `Acceso denegado: Tienes un permiso (${userAbsence.type}).`,
        { absenceType: userAbsence.type },
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
    let anomaly: ScheduleAnomaly | undefined;

    if (finalType === "EXIT") {
      // Staff re-scan when they are unsure the first swipe registered. Closing
      // the period would clock them out minutes after arriving, so a swipe
      // inside the minimum window is treated as a duplicate, not a check-out.
      const lastPeriod = myAttendance!.periods[periodIndex];
      if (lastPeriod?.checkIn && !lastPeriod.isAbsent) {
        const checkIn = new Date(lastPeriod.checkIn);
        const elapsedMs = now.getTime() - checkIn.getTime();
        if (elapsedMs < MIN_PERIOD_MINUTES * 60_000) {
          throw new ScanRejectedError(
            "DUPLICATE_SWIPE",
            "Tu asistencia ya está registrada.",
            {
              employeeName: user.fullName,
              lastCheckIn: formatClock(checkIn),
              minutes: MIN_PERIOD_MINUTES,
            },
          );
        }
      }
    }

    if (finalType === "ENTRY") {
      const assignment = await this.shiftRepo.getActiveAssignmentForUser(
        user.id,
        todayStr,
      );
      const activeShiftId = assignment ? assignment.shiftId : user.shiftId;
      const todayName = WEEK_DAYS[now.getDay()].id;

      // From here on, a scheduling problem no longer blocks the entry. The
      // scan is recorded and flagged so the admin can follow it up, because
      // the person is physically at work and cannot fix their own shift.
      const shift = activeShiftId
        ? await this.shiftRepo.getShiftById(activeShiftId)
        : null;

      if (!activeShiftId) {
        anomaly = { code: "NO_SHIFT_ASSIGNED" };
      } else if (!shift) {
        anomaly = { code: "SHIFT_NOT_FOUND" };
      } else if (!shift.workDays.includes(todayName)) {
        anomaly = { code: "REST_DAY", detail: todayName };
      } else {
        const blocks = shift.blocksByDay ? shift.blocksByDay[todayName] : [];
        if (!blocks || blocks.length === 0) {
          anomaly = { code: "NO_BLOCKS_CONFIGURED", detail: todayName };
        } else {
          let targetBlockIndex = -1;
          for (let i = 0; i < blocks.length; i++) {
            if (currentMinutes <= parseTimeToMinutes(blocks[i].end)) {
              targetBlockIndex = i;
              break;
            }
          }

          if (targetBlockIndex === -1) {
            const lastBlock = blocks[blocks.length - 1];
            throw new ScanRejectedError(
              "SHIFT_ENDED",
              `Tu turno finalizó a las ${lastBlock.end}.`,
              { endedAt: lastBlock.end },
            );
          }

          if (targetBlockIndex > periodIndex) {
            skippedBlocks = targetBlockIndex - periodIndex;
          } else if (targetBlockIndex < periodIndex) {
            throw new ScanRejectedError(
              "BLOCK_MISMATCH",
              "Desajuste de turnos. Contacta a administración.",
            );
          }

          const startMinutes = parseTimeToMinutes(blocks[targetBlockIndex].start);
          if (currentMinutes > startMinutes + (shift.toleranceMinutes || 0)) {
            isLate = true;
          }
        }
      }
    }

    await this.attendanceRepo.recordScan({
      userId: user.id,
      employeeNumber: user.employeeNumber || "0000",
      date: todayStr,
      type: finalType,
      time: now,
      isLate,
      skippedBlocks,
      anomaly,
    });

    return {
      employeeName: user.fullName,
      time: formatClock(now),
      isLate,
      type: finalType,
      skippedBlocks,
      anomaly,
    };
  }
}
