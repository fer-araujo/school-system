import { useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Holiday, HolidayType } from "../../../domain/models/Holiday";
import { stringsToSelectOptions } from "../../../utils/helpers";
import CustomSelect from "../ui/CustomSelect";
import CustomDatePicker from "../ui/CustomDatePicker";

export type HolidayFormData = Omit<Holiday, "id"> & { id?: string };

interface HolidayFormProps {
  initialData?: Holiday | null;
  onSubmit: (data: HolidayFormData) => Promise<void>;
  onCancel: () => void;
}

const HOLIDAY_TYPES: HolidayType[] = ["Oficial (Ley)", "Interno (Escolar)"];
const holidayTypes = stringsToSelectOptions(HOLIDAY_TYPES);

export default function HolidayForm({
  initialData,
  onSubmit,
  onCancel,
}: HolidayFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [type, setType] = useState<HolidayType>(
    initialData?.type || "Oficial (Ley)",
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "El motivo es obligatorio.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (!type) newErrors.type = "El tipo es obligatorio.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Revisa los campos requeridos.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ id: initialData?.id, name, date, type });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors({ ...errors, [field]: "" });
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
              Motivo / Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              placeholder="Ej. Día de la Independencia"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none text-sm font-light ${errors.name ? "border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10" : "border-slate-200 focus:ring-blue-500"}`}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1 pl-1">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                mode="single"
                value={date}
                onChange={(val) => {
                  setDate(val as string);
                  clearError("date");
                }}
                required
                error={errors.date}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Tipo de Asueto <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={type}
                onChange={(val) => {
                  setType(val as HolidayType);
                  clearError("type");
                }}
                placeholder="-- Seleccionar --"
                options={holidayTypes}
                required
                error={errors.type}
              />
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
