import type { ManageEmployees } from "./ManageEmployees";
import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
// 🌟 IMPORTAMOS EL REPOSITORIO DE CALENDARIO PARA LOS FESTIVOS
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { WorkPeriod } from "../../domain/models/User";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";

export interface ActivityItem {
  id: string;
  // 🌟 AÑADIMOS HOLIDAY PARA QUE SE VEA EN EL HISTORIAL
  type: "ATTENDANCE" | "ABSENCE" | "UNJUSTIFIED" | "HOLIDAY";
  date: string;
  isLate?: boolean;
  status?: string;
  reason?: string;
  notes?: string;
}

export class GetEmployeeStats {
  private manageEmployees: ManageEmployees;
  private attendanceRepo: AttendanceRepository;
  private absenceRepo: AbsenceRepository;
  private shiftRepo: ShiftRepository;
  private calendarRepo: CalendarRepository;

  constructor(
    manageEmployees: ManageEmployees,
    attendanceRepo: AttendanceRepository,
    absenceRepo: AbsenceRepository,
    shiftRepo: ShiftRepository,
    calendarRepo: CalendarRepository,
  ) {
    this.manageEmployees = manageEmployees;
    this.attendanceRepo = attendanceRepo;
    this.absenceRepo = absenceRepo;
    this.shiftRepo = shiftRepo;
    this.calendarRepo = calendarRepo;
  }

  async execute(userId: string, dateRange: { start: string; end: string }) {
    let totalAttendances = 0;
    let totalLates = 0;
    let totalAbsences = 0;
    const activities: ActivityItem[] = [];

    try {
      // 🚀 1. BULK FETCH: Descargamos datos usando los Repositorios (CERO Firebase aquí)
      const [
        allWorkers,
        shifts,
        allAssignments,
        allAbsences,
        allAttendances,
        allHolidays,
      ] = await Promise.all([
        this.manageEmployees.getAllWorkers(),
        this.shiftRepo.getAllShifts(),
        this.shiftRepo.getAllAssignments(),
        this.absenceRepo.getAbsencesByDateRange(dateRange.start, dateRange.end),
        this.attendanceRepo.getAttendancesByDateRange(
          dateRange.start,
          dateRange.end,
        ),
        this.calendarRepo.getHolidays(), // 🌟 TRAEMOS LOS FESTIVOS
      ]);

      const worker = allWorkers.find((w) => w.id === userId);
      if (!worker) throw new Error("Empleado no encontrado");

      // 2. Filtramos en memoria solo los datos de este empleado
      const userAbsences = allAbsences.filter((a) => a.userId === userId);
      const userAttendances = allAttendances.filter((a) => a.userId === userId);
      const userAssignments = allAssignments.filter((a) => a.userId === userId);

      // 3. Generamos el arreglo de fechas
      const dates: string[] = [];
      const curr = new Date(dateRange.start + "T12:00:00");
      const last = new Date(dateRange.end + "T12:00:00");
      while (curr <= last) {
        dates.push(curr.toISOString().split("T")[0]);
        curr.setDate(curr.getDate() + 1);
      }

      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      const todayStr = new Date(now.getTime() - offsetMs)
        .toISOString()
        .split("T")[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 4. Analizamos día por día
      for (const targetDate of dates) {
        const isPastDate = targetDate < todayStr;

        const attendanceRecord = userAttendances.find(
          (a) => a.date === targetDate,
        );
        const isHoliday = allHolidays.find((h) => h.date === targetDate);
        const absenceDetail = userAbsences.find(
          (a) => targetDate >= a.startDate && targetDate <= a.endDate,
        );

        // A. ¿Asistió a trabajar? (Prioridad 1: Si fue, cuenta, aunque sea festivo)
        if (attendanceRecord) {
          totalAttendances++;
          const hasLate = attendanceRecord.periods.some(
            (p: WorkPeriod) => p.isLate,
          );
          if (hasLate) totalLates++;

          activities.push({
            id: `att_${targetDate}`,
            type: "ATTENDANCE",
            date: targetDate,
            isLate: hasLate,
            status: attendanceRecord.status,
          });
          continue;
        }

        // B. ¿Es Día Festivo Oficial? (Prioridad 2)
        if (isHoliday) {
          activities.push({
            id: `hol_${targetDate}`,
            type: "HOLIDAY",
            date: targetDate,
            reason: isHoliday.name,
          });
          continue; // No sumamos falta, es día libre
        }

        // C. ¿Permiso Justificado / Vacaciones? (Prioridad 3)
        if (absenceDetail) {
          totalAbsences++;
          activities.push({
            id: `abs_${targetDate}`,
            type: "ABSENCE",
            date: targetDate,
            reason: absenceDetail.type,
            notes: absenceDetail.notes,
          });
          continue;
        }

        // D. Verificamos el turno de ese día para ver si debió ir
        const assignmentData = userAssignments.find(
          (a) =>
            targetDate >= a.validFrom &&
            (!a.validUntil || targetDate <= a.validUntil),
        );
        const activeShiftId = assignmentData
          ? assignmentData.shiftId
          : worker.shiftId;

        if (activeShiftId) {
          const shift = shifts.find((s) => s.id === activeShiftId);
          if (shift && shift.blocks && shift.blocks.length > 0) {
            const dateObj = new Date(targetDate + "T12:00:00");
            const targetDayId = WEEK_DAYS[dateObj.getDay()].id;

            if (!shift.workDays.includes(targetDayId)) continue; // Día de descanso

            const block = shift.blocks[0];
            const [h, m] = block.start.split(":").map(Number);
            const deadline = h * 60 + m + (shift.toleranceMinutes || 0);

            // E. Falta Injustificada
            if (
              isPastDate ||
              (targetDate === todayStr && currentMinutes > deadline)
            ) {
              totalAbsences++;
              activities.push({
                id: `unjust_${targetDate}`,
                type: "UNJUSTIFIED",
                date: targetDate,
                reason: "Falta Injustificada",
              });
            }
          }
        }
      }

      activities.sort((a, b) => b.date.localeCompare(a.date));

      return {
        stats: { totalAttendances, totalLates, totalAbsences },
        recentActivity: activities,
      };
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      throw error;
    }
  }
}
