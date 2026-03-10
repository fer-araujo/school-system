import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import type { Holiday } from "../../domain/models/Holiday";

export class ManageHolidays {
  private calendarRepo: CalendarRepository;
  constructor(calendarRepo: CalendarRepository) {
    this.calendarRepo = calendarRepo;
  }
    
  async getHolidays(): Promise<Holiday[]> {
    return this.calendarRepo.getAllHolidays();
  }

  async createHoliday(data: Omit<Holiday, "id">): Promise<void> {
    return this.calendarRepo.createHoliday(data);
  }

  async updateHoliday(data: Holiday): Promise<void> {
    return this.calendarRepo.updateHoliday(data);
  }

  async deleteHoliday(id: string): Promise<void> {
    return this.calendarRepo.deleteHoliday(id);
  }
}
