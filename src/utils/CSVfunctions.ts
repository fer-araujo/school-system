import type { DashboardTableRecord } from "../application/use-cases/GetDashboardStats";
import type { WorkPeriod } from "../domain/models/User";
import {
  getStatusPriority,
  calculateTotalMs,
  formatTotalTime,
} from "./helpers";

/**
 * Exporta los datos del Dashboard Principal a un archivo CSV compatible con Excel.
 */
export const exportAdminOverviewToCSV = (
  tableData: DashboardTableRecord[],
  selectedDate: string,
) => {
  if (tableData.length === 0) {
    alert("No hay registros para exportar en esta fecha.");
    return;
  }

  // 1. Definimos las cabeceras
  const headers = [
    "Empleado",
    "No. Empleado",
    "Departamento",
    "Estado General",
    "Tiempo Total",
    "Justificación / Notas",
  ];

  // 2. Mapeamos la data
  const csvRows = tableData.map((row) => {
    const priority = getStatusPriority(row);
    let estadoStr = "A Tiempo";

    if (priority === 1) estadoStr = "Falta";
    else if (priority === 2) estadoStr = "Falta Parcial";
    else if (priority === 3) estadoStr = "Retardo";
    else if (priority === 5) estadoStr = "Permiso";

    const hasAbsenceOnly = row.periods.every(
      (p: WorkPeriod) => p.isAbsent || !p.checkIn,
    );
    const tiempoTotalStr = hasAbsenceOnly
      ? "--:--"
      : formatTotalTime(calculateTotalMs(row.periods));

    // Envolvemos en comillas para evitar que comas accidentales rompan las columnas en Excel
    return [
      `"${row.workerName}"`,
      `"${row.employeeNumber}"`,
      `"${row.department || "Docencia"}"`,
      `"${estadoStr}"`,
      `"${tiempoTotalStr}"`,
      `"${row.absenceReason || ""}"`,
    ].join(",");
  });

  // 3. Unimos todo y agregamos BOM para soporte UTF-8 (Acentos y Ñ)
  const csvString = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  // 4. Descarga virtual
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Reporte_Asistencia_${selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
