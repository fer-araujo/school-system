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
  async createShift(name: string, blocks: TimeBlock[]): Promise<void> {
    this.validateShiftData(name, blocks);
    const shiftId = `shift_${Date.now()}`;
    await this.shiftRepo.saveShift({ id: shiftId, name, blocks });
  }

  async updateShift(
    shiftId: string,
    name: string,
    blocks: TimeBlock[],
  ): Promise<void> {
    if (!shiftId) throw new Error("ID de turno requerido para actualizar.");
    this.validateShiftData(name, blocks);
    await this.shiftRepo.saveShift({ id: shiftId, name, blocks });
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
      throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
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
