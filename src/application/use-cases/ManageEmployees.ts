import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { User } from "../../domain/models/User";
import type { EmployeeFormData } from "../../app/components/admin/EmployeeForm";

export class ManageEmployees {
  private employeeRepo: EmployeeRepository;
  private shiftRepo: ShiftRepository;
  constructor(
    employeeRepo: EmployeeRepository,
    shiftRepo: ShiftRepository
  ) {
    this.employeeRepo = employeeRepo;
    this.shiftRepo = shiftRepo;
  }

  async countActiveWorkers(): Promise<number> {
    return this.employeeRepo.countActiveWorkers();
  }

  async getAllWorkers(): Promise<User[]> {
    const today = new Date().toLocaleDateString("en-CA");
    
    // 🚀 Todo desde repositorios
    const [workers, shifts, assignments] = await Promise.all([
      this.employeeRepo.getAllWorkers(),
      this.shiftRepo.getAllShifts(),
      this.shiftRepo.getAllAssignments()
    ]);

    const shiftMap = new Map<string, string>();
    shifts.forEach((doc) => shiftMap.set(doc.id, doc.name));

    const activeAssignments = new Map<string, string>();
    assignments.forEach((a) => {
      const isAfterStart = today >= a.validFrom;
      const isBeforeEnd = a.validUntil ? today <= a.validUntil : true;
      if (isAfterStart && isBeforeEnd) {
        activeAssignments.set(a.userId, a.shiftId);
      }
    });

    return workers.map((worker) => {
      const currentShiftId = activeAssignments.get(worker.id) || worker.shiftId;
      return {
        ...worker,
        shiftId: currentShiftId,
        shiftName: currentShiftId ? shiftMap.get(currentShiftId) || "Turno eliminado" : "Sin asignar",
      };
    });
  }

  async createEmployee(data: EmployeeFormData): Promise<string> {
    if (!data.fullName || !data.position || !data.department || !data.badgeId) {
      throw new Error("Faltan campos obligatorios (incluyendo el ID del Gafete).");
    }

    // 🚀 Validación limpia
    const existingBadge = await this.employeeRepo.getWorkerByBadgeId(data.badgeId);
    if (existingBadge) throw new Error("Este Gafete (Badge) ya está asignado a otro empleado.");

    const generatedEmpNo = Math.floor(1000 + Math.random() * 9000).toString();
    const newUid = this.employeeRepo.generateNewId();

    const newUser: User = {
      id: newUid,
      email: data.email || "",
      fullName: data.fullName,
      role: "WORKER",
      employeeNumber: generatedEmpNo,
      phone: data.phone || "",
      department: data.department,
      position: data.position,
      isActive: true,
      shiftId: data.selectedShiftId || "",
      badgeId: data.badgeId,
    };

    await this.employeeRepo.createEmployee(newUser);
    return newUid;
  }

  async updateEmployee(data: EmployeeFormData): Promise<void> {
    if (!data.id) throw new Error("Se requiere el ID.");

    if (data.badgeId) {
      const existingBadge = await this.employeeRepo.getWorkerByBadgeId(data.badgeId);
      if (existingBadge && existingBadge.id !== data.id) {
        throw new Error("Este Gafete (Badge) ya está asignado a otro empleado.");
      }
    }

    await this.employeeRepo.updateEmployee(data.id, {
      fullName: data.fullName,
      email: data.email || "",
      phone: data.phone || "",
      department: data.department,
      position: data.position,
      shiftId: data.selectedShiftId || "",
      badgeId: data.badgeId,
    });
  }

  async toggleEmployeeStatus(uid: string, currentStatus: boolean): Promise<void> {
    await this.employeeRepo.updateEmployee(uid, { isActive: !currentStatus });
  }

  async deleteEmployeeFromDatabase(uid: string): Promise<void> {
    await this.employeeRepo.deleteEmployee(uid);
  }
}