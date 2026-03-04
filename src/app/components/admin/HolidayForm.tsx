import { useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import type { Holiday, HolidayType } from "../../../domain/models/Holiday";

export type HolidayFormData = Omit<Holiday, "id"> & { id?: string };

interface HolidayFormProps {
  initialData?: Holiday | null;
  onSubmit: (data: HolidayFormData) => Promise<void>;
  onCancel: () => void;
}

const HOLIDAY_TYPES: HolidayType[] = ["Oficial (Ley)", "Interno (Escolar)"];

export default function HolidayForm({
  initialData,
  onSubmit,
  onCancel,
}: HolidayFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [date, setDate] = useState(
    initialData?.date || new Date().toLocaleDateString("en-CA"),
  );
  const [type, setType] = useState<HolidayType>(
    initialData?.type || "Oficial (Ley)",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ id: initialData?.id, name, date, type });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
          <div className="bg-emerald-50 p-1.5 rounded-md">
            <Calendar size={16} className="text-emerald-600" />
          </div>
          Detalles del Día Festivo
        </h4>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Motivo / Nombre
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Día de la Independencia"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-light"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Tipo de Asueto
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as HolidayType)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light bg-white"
              >
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? "Guardar Cambios" : "Agregar Fecha"}
        </button>
      </div>
    </form>
  );
}
