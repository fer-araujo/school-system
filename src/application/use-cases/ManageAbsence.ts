import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { Absence } from "../../domain/models/Absence";

export class ManageAbsences {
  private absenceRepo: AbsenceRepository;
  private employeeRepo: EmployeeRepository;
  constructor(
    absenceRepo: AbsenceRepository,
    employeeRepo: EmployeeRepository,
  ) {
    this.absenceRepo = absenceRepo;
    this.employeeRepo = employeeRepo;
  }

  async getAllAbsences(): Promise<Absence[]> {
    // 1. Descargamos usando Repositorios puros
    const [workers, absences] = await Promise.all([
      this.employeeRepo.getAllWorkers(),
      this.absenceRepo.getAllAbsences(), // 🌟 OJO: Asegúrate de tener este método en tu FirebaseAbsenceRepository
    ]);

    const userMap = new Map<string, string>();
    workers.forEach((w) => userMap.set(w.id, w.fullName));

    // 2. Mapeamos y ordenamos en memoria
    const enrichedAbsences = absences.map((a) => ({
      ...a,
      employeeName: userMap.get(a.userId) || "Empleado Eliminado o Inactivo",
    }));

    return enrichedAbsences.sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    );
  }

  async createAbsence(
    data: Omit<Absence, "id" | "employeeName">,
  ): Promise<void> {
    const newId = `abs_${Date.now()}`;
    await this.absenceRepo.saveAbsences([{ ...data, id: newId } as Absence]);
  }

  async updateAbsence(data: Absence): Promise<void> {
    // Omitimos enviar employeeName al repositorio base
    const cleanData = {
      id: data.id,
      userId: data.userId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
    } as Absence;

    await this.absenceRepo.saveAbsences([cleanData]);
  }

  async deleteAbsence(id: string): Promise<void> {
    // 🌟 OJO: Añade deleteAbsence(id: string): Promise<void> en tu AbsenceRepository si no lo tienes
    await this.absenceRepo.deleteAbsence(id);
  }
}
