import type { ManageEmployees } from "./ManageEmployees";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type {
  AttendanceWithWorker,
  WorkPeriod,
} from "../../domain/models/User";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";

export interface DashboardTableRecord extends AttendanceWithWorker {
  department?: string;
  isJustified?: boolean;
  absenceReason?: string;
}

export class GetDashboardStats {
  private manageEmployees: ManageEmployees;
  private absenceRepo: AbsenceRepository;
  private shiftRepo: ShiftRepository;

  constructor(
    manageEmployees: ManageEmployees,
    absenceRepo: AbsenceRepository,
    shiftRepo: ShiftRepository,
  ) {
    this.manageEmployees = manageEmployees;
    this.absenceRepo = absenceRepo;
    this.shiftRepo = shiftRepo;
  }

  async execute(
    targetDate: string,
    currentAttendances: AttendanceWithWorker[],
  ) {
    try {
      const [allWorkers, shifts, absences] = await Promise.all([
        this.manageEmployees.getAllWorkers(),
        this.shiftRepo.getAllShifts(),
        this.absenceRepo.getAbsencesByDate(targetDate),
      ]);

      const activeWorkers = allWorkers.filter((w) => w.isActive);
      const absentUserIds = new Set(absences.map((a) => a.userId));
      const attendedUserIds = new Set(currentAttendances.map((a) => a.userId));

      let expectedToday = 0;
      let faltasInjustificadas = 0;
      let maxDeadline = -1;

      const now = new Date();
      // Ajuste de zona horaria para obtener la fecha local correcta
      const offsetMs = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - offsetMs);
      const todayStr = localNow.toISOString().split("T")[0];

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 🌟 LÓGICA DE VIAJE EN EL TIEMPO: ¿Estamos revisando un día en el pasado?
      const isPastDate = targetDate < todayStr;

      const fullTableData: DashboardTableRecord[] = [];

      const phantomPeriod: WorkPeriod = {
        isAbsent: true,
        checkIn: null as unknown as Date,
        checkOut: null as unknown as Date,
      };

      for (const worker of activeWorkers) {
        // 1. ¿Tiene falta justificada (Permiso/Vacaciones)?
        if (absentUserIds.has(worker.id)) {
          const absenceDetail = absences.find((a) => a.userId === worker.id);
          fullTableData.push({
            id: `${worker.id}_${targetDate}`,
            userId: worker.id,
            employeeNumber: worker.employeeNumber || "0000",
            date: targetDate,
            periods: [phantomPeriod],
            status: "ABSENT",
            workerName: worker.fullName || "Empleado",
            department: worker.department,
            isJustified: true,
            absenceReason: absenceDetail?.type || "Permiso",
          });
          continue;
        }

        // 2. Revisamos su turno
        // 2. Revisamos su turno
        const assignment = await this.shiftRepo.getActiveAssignmentForUser(
          worker.id,
          targetDate,
        );
        if (assignment) {
          const shift = shifts.find((s) => s.id === assignment.shiftId);
          if (shift && shift.blocks && shift.blocks.length > 0) {
            // Forzamos la hora a mediodía para evitar saltos de zona horaria por UTC
            const dateObj = new Date(targetDate + "T12:00:00");
            const dayIndex = dateObj.getDay(); // 0 = Domingo, 1 = Lunes...

            // Leemos el ID exacto ("Lunes", "Martes") de tu constante global
            const targetDayId = WEEK_DAYS[dayIndex].id;

            // Si el día de hoy NO está en los días laborables del turno, lo saltamos (descanso)
            if (!shift.workDays.includes(targetDayId)) {
              continue;
            }

            expectedToday++;

            const block = shift.blocks[0];
            const [h, m] = block.start.split(":").map(Number);
            const startMinutes = h * 60 + m;
            const tolerance = shift.toleranceMinutes || 0;
            const deadline = startMinutes + tolerance;

            if (deadline > maxDeadline) maxDeadline = deadline;

            // 3. ¿Vino a trabajar?
            if (attendedUserIds.has(worker.id)) {
              const attendanceRecord = currentAttendances.find(
                (a) => a.userId === worker.id,
              );
              if (attendanceRecord) {
                const faltasPrevias = attendanceRecord.periods.filter(
                  (p) => p.isAbsent,
                ).length;
                faltasInjustificadas += faltasPrevias;

                fullTableData.push({
                  ...attendanceRecord,
                  department: worker.department,
                });
              }
            }
            // 4. No vino en absoluto. ¿Ya se le hizo tarde (HOY) o el día ya pasó (AYER)?
            // 🌟 CORRECCIÓN: Ahora evaluamos si es una fecha pasada OR (es hoy y ya pasó el tiempo límite)
            else if (
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
                isJustified: false,
              });
            }
          }
        }
      }

      // Solo detenemos el Polling (refresco automático) si el día seleccionado NO es hoy,
      // o si es hoy y ya pasó el límite máximo del último empleado.
      const isPollingNeeded =
        targetDate === todayStr && currentMinutes <= maxDeadline;

      return {
        totalEmployees: activeWorkers.length,
        expectedToday,
        totalAbsences: absentUserIds.size,
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
