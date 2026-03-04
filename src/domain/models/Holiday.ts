export type HolidayType = "Oficial (Ley)" | "Interno (Escolar)";

export interface Holiday {
  id: string;
  name: string;      // Ej: "Día del Trabajo", "Consejo Técnico"
  date: string;      // Formato YYYY-MM-DD
  type: HolidayType; 
}