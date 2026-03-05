import type { ManageEmployees } from "./ManageEmployees";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type {
  AttendanceWithWorker,
  WorkPeriod,
} from "../../domain/models/User";

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
      const todayStr = now.toLocaleDateString("en-CA");
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

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
        const assignment = await this.shiftRepo.getActiveAssignmentForUser(
          worker.id,
          targetDate,
        );
        if (assignment) {
          const shift = shifts.find((s) => s.id === assignment.shiftId);
          if (shift && shift.blocks && shift.blocks.length > 0) {
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
                // 🚨 CORRECCIÓN: Si vino, pero tiene bloques marcados como 'isAbsent' en Firebase,
                // sumamos esas faltas parciales al contador de la tarjeta roja.
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
            // 4. No vino en absoluto. ¿Ya se le hizo tarde?
            else if (targetDate === todayStr && currentMinutes > deadline) {
              faltasInjustificadas++;

              // 🚨 CORRECCIÓN: Eliminamos el recordScan() para no marcarles "entradas" falsas.
              // Solo construimos la falta de manera visual.
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
