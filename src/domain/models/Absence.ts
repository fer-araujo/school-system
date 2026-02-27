export type AbsenceType = 'VACATION' | 'SICK_LEAVE';

export interface Absence {
  id: string;       // Formato: UID_YYYY-MM-DD
  userId: string;
  date: string;     // YYYY-MM-DD
  type: AbsenceType;
  notes: string;    // Ej: "Receta IMSS #123"
}