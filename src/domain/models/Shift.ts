// Define un bloque de trabajo (ej. 09:00 a 13:00)
export interface TimeBlock {
  start: string; // Formato "HH:mm" (ej. "09:00")
  end: string; // Formato "HH:mm" (ej. "13:00")
}

// El molde del turno que crea el Admin (ej. "Tallerista Mixto")
export interface Shift {
  id: string;
  name: string;
  blocks: TimeBlock[];
  workDays: string[]; // Los días que aplica el turno
  toleranceMinutes: number; // Minutos de tolerancia para el primer bloque
}

// La conexión temporal entre un maestro y un turno
export interface ShiftAssignment {
  id: string; // Generado automáticamente
  userId: string;
  shiftId: string;
  validFrom: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD (Si es indefinido, se deja vacío)
}
