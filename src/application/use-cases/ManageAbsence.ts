import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { Absence, AbsenceType } from "../../domain/models/Absence";

export class ManageAbsences {
  private absenceRepo: AbsenceRepository;

  constructor(absenceRepo: AbsenceRepository) {
    this.absenceRepo = absenceRepo;
  }

  /**
   * Genera y guarda un registro de ausencia por cada día en el rango especificado.
   */
  async assignAbsenceRange(
    userId: string, 
    startDateIso: string, 
    endDateIso: string, 
    type: AbsenceType, 
    notes: string
  ): Promise<void> {
    
    if (!userId || !startDateIso || !endDateIso) {
      throw new Error("Faltan datos obligatorios para registrar la ausencia.");
    }

    const start = new Date(`${startDateIso}T00:00:00`);
    const end = new Date(`${endDateIso}T00:00:00`);

    if (start > end) {
      throw new Error("La fecha de inicio no puede ser mayor a la fecha de fin.");
    }

    const absencesToSave: Absence[] = [];
    const currentDate = new Date(start);

    // Bucle para crear un registro por cada día en el rango
    while (currentDate <= end) {
      const dateString = currentDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      absencesToSave.push({
        id: `${userId}_${dateString}`,
        userId,
        date: dateString,
        type,
        notes
      });

      // Avanzamos al día siguiente
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Guardamos todo el lote en Firebase
    await this.absenceRepo.saveAbsences(absencesToSave);
  }
}