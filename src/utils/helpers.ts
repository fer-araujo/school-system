// src/utils/ui-helpers.ts

import type { SelectOption } from "../app/components/ui/CustomSelect";
import type { DashboardTableRecord } from "../application/use-cases/GetDashboardStats";
import type { WorkPeriod } from "../domain/models/User";

/**
 * Genera clases de Tailwind consistentes (fondo, texto, borde)
 * basándose en el nombre del usuario (Hashing string).
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-yellow-100 text-yellow-700 border-yellow-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
  ];

  if (!name) return colors[0]; // Fallback de seguridad

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Math.abs para evitar índices negativos
  return colors[Math.abs(hash) % colors.length];
};

// Función auxiliar pura (Puede ir al final del archivo o en un utils)
export const handleShareCredentials = (
  method: "whatsapp" | "email",
  data: {
    fullName: string;
    email: string;
    tempPass: string;
    empNo: string;
    phone: string;
  },
) => {
  const msg = `Hola ${data.fullName}, bienvenida.\nAcceso: ${data.email}\nPass Temporal: ${data.tempPass}\nNo. Emp: ${data.empNo}\n(El sistema te pedirá cambiar tu contraseña al entrar).`;
  const encoded = encodeURIComponent(msg);

  if (method === "whatsapp")
    window.open(`https://wa.me/${data.phone}?text=${encoded}`, "_blank");
  if (method === "email")
    window.open(
      `mailto:${data.email}?subject=Accesos&body=${encoded}`,
      "_blank",
    );
};

// --- FUNCIONES PURAS PARA CALCULAR (Útiles para el Sorting) ---
export const calculateTotalMs = (periods: WorkPeriod[]) => {
  let totalMs = 0;
  const now = new Date();
  periods.forEach((p) => {
    if (p.isAbsent || !p.checkIn) return;
    const end = p.checkOut ? p.checkOut.getTime() : now.getTime();
    totalMs += end - p.checkIn.getTime();
  });
  return totalMs;
};

export const formatTime = (dateValue?: Date) => {
  if (!dateValue) return "--:--";
  return dateValue.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTotalTime = (totalMs: number) => {
  if (totalMs === 0) return "0h 0m";
  const totalMins = Math.floor(totalMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
};

export const getStatusPriority = (row: DashboardTableRecord) => {
  if (row.isJustified) return 5;
  const allAbsent =
    row.periods.length > 0 &&
    row.periods.every((p) => p.isAbsent || !p.checkIn);
  const someAbsent = row.periods.some((p) => p.isAbsent || !p.checkIn);
  const hasLate = row.periods.some((p) => p.isLate);

  if (allAbsent) return 1;
  if (someAbsent) return 2;
  if (hasLate) return 3;
  return 4;
};

/**
 * Convierte un arreglo de strings simple en opciones compatibles con CustomSelect.
 */
export const stringsToSelectOptions = (items: string[]): SelectOption[] => {
  return items.map((item) => ({
    value: item,
    label: item,
  }));
};
