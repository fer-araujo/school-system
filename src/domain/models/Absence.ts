export type AbsenceType = "Enfermedad" | "Vacaciones" | "Permiso Personal" | "Falta Injustificada";

export interface Absence {
  id: string;
  userId: string;       // El ID del maestro que falta
  employeeName?: string; // Lo inyectaremos en memoria para la tabla
  type: AbsenceType;
  startDate: string;    // Formato YYYY-MM-DD
  endDate: string;      // Formato YYYY-MM-DD
  notes: string;        // Ej: "Justificado con receta médica"
}