import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type {
  Shift,
  ShiftAssignment,
  TimeBlock,
} from "../../domain/models/Shift";

export class ManageShifts {
  private shiftRepo: ShiftRepository;

  constructor(shiftRepo: ShiftRepository) {
    this.shiftRepo = shiftRepo;
  }

  // 1. Crear un nuevo turno (Molde)
  async createShift(data: Omit<Shift, "id">): Promise<void> {
    // BLINDAJE: Validamos los datos antes de hacer cualquier cosa
    this.validateShiftData(data.name, data.blocks);

    const shiftId = `shift_${Date.now()}`;

    const newShift: Shift = {
      id: shiftId,
      name: data.name,
      blocks: data.blocks,
      workDays: data.workDays,
      toleranceMinutes: data.toleranceMinutes,
    };

    await this.shiftRepo.saveShift(newShift);
  }

  // Editar un turno existente
  async updateShift(data: Shift): Promise<void> {
    // BLINDAJE: También validamos al momento de editar
    this.validateShiftData(data.name, data.blocks);

    await this.shiftRepo.saveShift(data);
  }

  async deleteShift(shiftId: string): Promise<void> {
    if (!shiftId) throw new Error("ID de turno requerido para eliminar.");
    await this.shiftRepo.deleteShift(shiftId);
  }

  // 2. Obtener catálogo
  async getCatalog(): Promise<Shift[]> {
    return await this.shiftRepo.getAllShifts();
  }

  // 3. Asignar turno a un maestro
  async assignToUser(
    userId: string,
    shiftId: string,
    validFrom: string,
    validUntil?: string,
  ): Promise<void> {
    if (!userId || !shiftId || !validFrom) {
      throw new Error("Faltan datos obligatorios para la asignación.");
    }

    if (validUntil && validFrom > validUntil) {
      throw new Error(
        "La fecha de inicio no puede ser posterior a la fecha de fin.",
      );
    }

    // Usamos el spread operator condicional para evitar el "undefined"
    const assignment: ShiftAssignment = {
      id: `assign_${userId}_${Date.now()}`,
      userId,
      shiftId,
      validFrom,
      ...(validUntil !== undefined && { validUntil }), // ¡El truco de magia!
    };

    await this.shiftRepo.saveAssignment(assignment);
  }

  // Utilidad privada para no repetir código de validación
  private validateShiftData(name: string, blocks: TimeBlock[]) {
    if (!name.trim()) throw new Error("El turno debe tener un nombre.");
    if (blocks.length === 0)
      throw new Error("El turno debe tener al menos un bloque de horario.");
    blocks.forEach((b) => {
      if (!b.start || !b.end)
        throw new Error("Los bloques deben tener hora de inicio y fin.");
      if (b.start >= b.end)
        throw new Error(
          `El bloque ${b.start}-${b.end} es inválido. La salida debe ser después.`,
        );
    });
  }
}
