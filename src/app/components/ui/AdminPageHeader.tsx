import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  // Buscador (Opcional)
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  // Botón Principal (Opcional)
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
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
}: AdminPageHeaderProps) {
  const showSearch = onSearchChange !== undefined;
  const showAction = onAction !== undefined && actionLabel;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6 w-full">
      {/* Textos a la izquierda */}
      <div className="w-full md:w-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-1 font-normal">
          {description}
        </p>
      </div>

      {/* Contenedor derecho responsivo */}
      {(showSearch || showAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-between lg:justify-end gap-3 w-full md:w-auto shrink-0">
          {/* BUSCADOR */}
          {showSearch && (
            <div className="relative group w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-light focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-86 lg:w-68 shadow-sm transition-all"
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

          {/* BOTÓN DE ACCIÓN */}
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
      )}
    </div>
  );
}
