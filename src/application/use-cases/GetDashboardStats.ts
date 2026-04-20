import type { ManageEmployees } from "./ManageEmployees";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type {
  AttendanceWithWorker,
  WorkPeriod,
} from "../../domain/models/User";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";

// 🌟 1. AGREGAMOS shiftName A LA INTERFAZ
export interface DashboardTableRecord extends AttendanceWithWorker {
  department?: string;
  shiftName?: string;
  isJustified?: boolean;
  absenceReason?: string;
}

export class GetDashboardStats {
  private manageEmployees: ManageEmployees;
  private absenceRepo: AbsenceRepository;
  private shiftRepo: ShiftRepository;
  private calendarRepo: CalendarRepository;

  constructor(
    manageEmployees: ManageEmployees,
    absenceRepo: AbsenceRepository,
    shiftRepo: ShiftRepository,
    calendarRepo: CalendarRepository,
  ) {
    this.manageEmployees = manageEmployees;
    this.absenceRepo = absenceRepo;
    this.shiftRepo = shiftRepo;
    this.calendarRepo = calendarRepo;
  }

  async execute(
    dateRange: { start: string; end: string },
    currentAttendances: AttendanceWithWorker[],
  ) {
    try {
      const [allWorkers, shifts, allAssignments, allAbsences, allHolidays] =
        await Promise.all([
          this.manageEmployees.getAllWorkers(),
          this.shiftRepo.getAllShifts(),
          this.shiftRepo.getAllAssignments(),
          this.absenceRepo.getAbsencesByDateRange(
            dateRange.start,
            dateRange.end,
          ),
          this.calendarRepo.getAllHolidays(),
        ]);

      const activeWorkers = allWorkers.filter((w) => w.isActive);

      const dates: string[] = [];
      const curr = new Date(dateRange.start + "T12:00:00");
      const last = new Date(dateRange.end + "T12:00:00");
      while (curr <= last) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
      }

      let expectedToday = 0;
      let faltasInjustificadas = 0;
      let totalAbsences = 0;
      let maxDeadline = -1;
      const fullTableData: DashboardTableRecord[] = [];

      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - offsetMs);
      const todayStr = localNow.toISOString().split("T")[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const phantomPeriod: WorkPeriod = {
        isAbsent: true,
        checkIn: null as unknown as Date,
        checkOut: null as unknown as Date,
      };

      for (let i = 0; i < dates.length; i++) {
        const targetDate = dates[i];
        const isPastDate = targetDate < todayStr;
        const isHoliday = allHolidays.find((h) => h.date === targetDate);

        const attendancesForDate = currentAttendances.filter(
          (a) => a.date === targetDate,
        );
        const attendedUserIds = new Set(
          attendancesForDate.map((a) => a.userId),
        );

        for (const worker of activeWorkers) {
          // 🌟 2. RESOLVEMOS EL TURNO PRIMERO PARA PODER USAR SU NOMBRE EN TODAS PARTES
          const assignmentData = allAssignments.find(
            (a) =>
              a.userId === worker.id &&
              targetDate >= a.validFrom &&
              (!a.validUntil || targetDate <= a.validUntil),
          );

          const activeShiftId = assignmentData
            ? assignmentData.shiftId
            : worker.shiftId;
          const shift = activeShiftId
            ? shifts.find((s) => s.id === activeShiftId)
            : undefined;
          const currentShiftName = shift ? shift.name : "Sin Turno";

          // A. ¿Asistió a pesar del festivo/permiso?
          if (attendedUserIds.has(worker.id)) {
            const attendanceRecord = attendancesForDate.find(
              (a) => a.userId === worker.id,
            );
            if (attendanceRecord) {
              faltasInjustificadas += attendanceRecord.periods.filter(
                (p) => p.isAbsent,
              ).length;
              fullTableData.push({
                ...attendanceRecord,
                department: worker.department,
                shiftName: currentShiftName, // 🌟 INYECTAMOS EL TURNO
              });
            }
            continue;
          }

          // B. ¿Es Día Festivo?
          if (isHoliday) continue;

          // C. ¿Falta Justificada?
          const absenceDetail = allAbsences.find(
            (a) =>
              a.userId === worker.id &&
              targetDate >= a.startDate &&
              targetDate <= a.endDate,
          );

          if (absenceDetail) {
            totalAbsences++;
            fullTableData.push({
              id: `${worker.id}_${targetDate}`,
              userId: worker.id,
              employeeNumber: worker.employeeNumber || "0000",
              date: targetDate,
              periods: [phantomPeriod],
              status: "ABSENT",
              workerName: worker.fullName || "Empleado",
              department: worker.department,
              shiftName: currentShiftName, // 🌟 INYECTAMOS EL TURNO
              isJustified: true,
              absenceReason: absenceDetail.type || "Permiso",
            });
            continue;
          }

          // D. Evaluación de Falta Injustificada
          if (shift) {
            const dateObj = new Date(targetDate + "T12:00:00");
            const targetDayId = WEEK_DAYS[dateObj.getDay()].id;

            if (
              shift.blocksByDay &&
              shift.blocksByDay[targetDayId]?.length > 0 &&
              shift.workDays.includes(targetDayId)
            ) {
              expectedToday++;
              const block = shift.blocksByDay[targetDayId][0];
              const [h, m] = block.start.split(":").map(Number);
              const deadline = h * 60 + m + (shift.toleranceMinutes || 0);

              if (targetDate === todayStr && deadline > maxDeadline)
                maxDeadline = deadline;

              if (
                isPastDate ||
                (targetDate === todayStr && currentMinutes > deadline)
              ) {
                faltasInjustificadas++;
                fullTableData.push({
                  id: `${worker.id}_${targetDate}`,
                  userId: worker.id,
                  employeeNumber: worker.employeeNumber || "0000",
                  date: targetDate,
                  periods: [phantomPeriod],
                  status: "ABSENT",
                  workerName: worker.fullName || "Empleado",
                  department: worker.department,
                  shiftName: currentShiftName, // 🌟 INYECTAMOS EL TURNO
                  isJustified: false,
                });
              }
            }
          }
        }
      }

      fullTableData.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return a.workerName.localeCompare(b.workerName);
      });

      const isPollingNeeded =
        dateRange.start === todayStr &&
        dateRange.end === todayStr &&
        currentMinutes <= maxDeadline;

      return {
        totalEmployees: activeWorkers.length,
        expectedToday,
        totalAbsences,
        faltasInjustificadas,
        isPollingNeeded,
        fullTableData,
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return {
        totalEmployees: 0,
        expectedToday: 0,
        totalAbsences: 0,
        faltasInjustificadas: 0,
        isPollingNeeded: false,
        fullTableData: currentAttendances as DashboardTableRecord[],
      };
    }
  }
}
