import type { GroupedEmployeeRecord } from "../app/pages/AdminOverview";

export const exportAdminOverviewToCSV = (
  data: GroupedEmployeeRecord[],
  dateRangeStr: string,
) => {
  // 1. Cabeceras del CSV (Alineadas con la nueva tabla)
  const headers = [
    "Nombre del Empleado",
    "Num. Emp",
    "Departamento",
    "Total Asistencias",
    "Total Retardos",
    "Faltas Injustificadas",
    "Permisos Justificados",
  ];

  // 2. Mapear los datos de cada empleado
  const rows = data.map((emp) => [
    `"${emp.workerName}"`, // Entre comillas por si tienen comas en su nombre
    `"${emp.employeeNumber}"`,
    `"${emp.department}"`,
    emp.totalAttendances,
    emp.totalLates,
    emp.totalUnjustified,
    emp.totalPermissions,
  ]);

  // 3. Crear contenido CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // 4. Forzar BOM (\uFEFF) para que Excel lea acentos y ñ correctamente
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `Reporte_Resumen_${dateRangeStr}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
