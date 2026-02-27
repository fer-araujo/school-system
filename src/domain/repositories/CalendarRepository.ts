import type { Holiday } from "../models/Calendar";

export interface CalendarRepository {
  getHolidayByDate(date: string): Promise<Holiday | null>;
  saveHoliday(holiday: Holiday): Promise<void>;
  getUpcomingHolidays(): Promise<Holiday[]>;
  deleteHoliday(date: string): Promise<void>; // <-- NUEVO
}
