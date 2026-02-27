import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { Holiday } from "../../domain/models/Calendar";

export class ManageHolidays {
  private calendarRepo: CalendarRepository;

  constructor(calendarRepo: CalendarRepository) {
    this.calendarRepo = calendarRepo;
  }

  async getUpcoming(): Promise<Holiday[]> {
    // Directo de la base de datos, limpio y sencillo
    return await this.calendarRepo.getUpcomingHolidays();
  }

  async save(
    date: string,
    reason: string,
    type: Holiday["type"],
  ): Promise<void> {
    if (!date || !reason)
      throw new Error("La fecha y el motivo son obligatorios.");
    await this.calendarRepo.saveHoliday({ date, reason, type });
  }

  async delete(date: string): Promise<void> {
    if (!date) throw new Error("Se requiere una fecha para eliminar.");
    await this.calendarRepo.deleteHoliday(date);
  }
}
