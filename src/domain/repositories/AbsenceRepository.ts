import type { Absence } from "../models/Absence";

export interface AbsenceRepository {
  saveAbsences(absences: Absence[]): Promise<void>;
  getAbsenceForUserAndDate(
    userId: string,
    date: string,
  ): Promise<Absence | null>;
  countAbsencesByDate(date: string): Promise<number>;
  getAbsencesByDate(date: string): Promise<Absence[]>;
}
