export type HolidayType = 'OFFICIAL' | 'SEP' | 'CUSTOM';

export interface Holiday {
  date: string;     // YYYY-MM-DD
  reason: string;   // Ej: "Natalicio de Benito Juárez" o "Consejo Técnico"
  type: HolidayType;
}