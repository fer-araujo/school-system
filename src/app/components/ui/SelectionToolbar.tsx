import React from "react";
import { Users, X } from "lucide-react";

interface SelectionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children?: React.ReactNode; // Aquí inyectaremos el Select de Turnos u otras acciones
}

export default function SelectionToolbar({
  selectedCount,
  onClearSelection,
  children,
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in duration-300 sticky top-4 z-20">
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100/50">
          <Users size={20} />
        </div>
        <div>
          <span className="font-bold text-slate-800 text-sm">
            {selectedCount}{" "}
            {selectedCount === 1
              ? "elemento seleccionado"
              : "elementos seleccionados"}
          </span>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Listos para acción masiva
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Aquí renderizamos las acciones específicas de cada página */}
        {children}

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <button
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Cancelar selección"
          onClick={onClearSelection}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
