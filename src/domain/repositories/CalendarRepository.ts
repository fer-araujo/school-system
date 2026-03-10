import type { Holiday } from "../models/Holiday";

export interface CalendarRepository {
  getHolidays(): Promise<Holiday[]>;
  getAllHolidays(): Promise<Holiday[]>; // 🌟 NUEVO
  getHolidayByDate(dateIso: string): Promise<Holiday | null>;
  createHoliday(data: Omit<Holiday, "id">): Promise<void>;
  updateHoliday(data: Holiday): Promise<void>;
  deleteHoliday(id: string): Promise<void>;
}
