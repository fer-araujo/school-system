import { Search, X, Download } from "lucide-react";
import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description: string;

  // Buscador (Opcional)
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Botón Principal (Ej. Agregar, Crear)
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;

  // Botón Exportar CSV (Opcional)
  onExportCSV?: () => void;

  // Rango de Fechas (Opcional)
  dateRange?: { start: string; end: string };
  onDateRangeChange?: (range: { start: string; end: string }) => void;

  // Fecha Única (Opcional - por si no quieres rango en alguna vista)
  singleDate?: string;
  onSingleDateChange?: (date: string) => void;
}

export default function AdminPageHeader({
  title,
  description,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  actionLabel,
  actionIcon,
  onAction,
  onExportCSV,
  dateRange,
  onDateRangeChange,
  singleDate,
  onSingleDateChange,
}: AdminPageHeaderProps) {
  const showSearch = onSearchChange !== undefined;
  const showAction = onAction !== undefined && actionLabel;
  const showDateRange =
    onDateRangeChange !== undefined && dateRange !== undefined;
  const showSingleDate =
    onSingleDateChange !== undefined && singleDate !== undefined;

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6 w-full">
      {/* Textos a la izquierda */}
      <div className="w-full lg:w-auto shrink-0">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1 font-normal">
          {description}
        </p>
      </div>

      {/* Contenedor derecho (Filtros y Acciones) */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full flex-wrap">
        {/* BUSCADOR */}
        {showSearch && (
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-64 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* FECHA ÚNICA */}
        {showSingleDate && !showDateRange && (
          <div className="w-full sm:w-auto">
            <input
              type="date"
              value={singleDate}
              onChange={(e) => onSingleDateChange(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
            />
          </div>
        )}

        {/* RANGO DE FECHAS */}
        {showDateRange && (
          <div className="flex items-center gap-2 w-full sm:w-auto bg-white border border-slate-200 rounded-lg shadow-sm px-2 py-1.5 transition-colors hover:border-slate-300 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 hidden md:block">
              Rango:
            </span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, start: e.target.value })
              }
              className="px-2 py-1 bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer w-31.25"
            />
            <span className="text-slate-300 font-light">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                onDateRangeChange({ ...dateRange, end: e.target.value })
              }
              className="px-2 py-1 bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer w-31.25"
            />
          </div>
        )}

        {/* DIVISOR VISUAL */}
        {(showSearch || showDateRange || showSingleDate) &&
          (showAction || onExportCSV) && (
            <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>
          )}

        {/* BOTÓN EXPORTAR CSV */}
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm w-full sm:w-auto shrink-0 active:scale-95"
            title="Exportar a Excel (CSV)"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* BOTÓN DE ACCIÓN PRINCIPAL */}
        {showAction && (
          <button
            onClick={onAction}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto shrink-0"
          >
            {actionIcon && <span className="shrink-0">{actionIcon}</span>}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
