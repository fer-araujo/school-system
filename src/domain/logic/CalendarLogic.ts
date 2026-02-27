import type { Holiday } from "../models/Calendar";

export class CalendarLogic {
  // Feriados fijos de México (MM-DD)
  private static readonly feriadosFijos: readonly string[] = [
    "01-01", // Año Nuevo
    "05-01", // Día del Trabajo
    "09-16", // Independencia
    "12-25", // Navidad
  ];

  /**
   * Verifica solo los feriados que NO cambian año con año.
   * Retorna un Holiday si es festivo, o null si es un día normal.
   */
  static getOfficialStaticHoliday(dateIso: string): Holiday | null {
    const parts = dateIso.split("-");
    if (parts.length !== 3) return null;

    const monthAndDay = `${parts[1]}-${parts[2]}`;

    if (this.feriadosFijos.includes(monthAndDay)) {
      return {
        date: dateIso,
        reason: "Día Feriado Oficial (Ley Federal del Trabajo)",
        type: "OFFICIAL",
      };
    }

    // Aquí podrías agregar algoritmos matemáticos para calcular el
    // "Tercer Lunes de Noviembre" si quisieras no usar la base de datos para eso.

    return null;
  }
}
