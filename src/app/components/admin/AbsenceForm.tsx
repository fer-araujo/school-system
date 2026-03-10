import { useState } from "react";
import { Loader2, CalendarX, FileText } from "lucide-react";
import type { Absence, AbsenceType } from "../../../domain/models/Absence";
import type { User } from "../../../domain/models/User";
import CustomSelect from "../ui/CustomSelect";
import CustomDatePicker, { type DateRange } from "../ui/CustomDatePicker";
import { stringsToSelectOptions } from "../../../utils/helpers";
import toast from "react-hot-toast";
// import toast from "react-hot-toast"; // <-- Asumiendo que usaremos una librería, ajustaremos esto luego

export type AbsenceFormData = Omit<Absence, "id" | "employeeName"> & {
  id?: string;
};

interface AbsenceFormProps {
  initialData?: Absence | null;
  employees: User[];
  onSubmit: (data: AbsenceFormData) => Promise<void>;
  onCancel: () => void;
}

const ABSENCE_TYPES: AbsenceType[] = [
  "Enfermedad",
  "Vacaciones",
  "Permiso Personal",
  "Falta Injustificada",
];

const absenceTypes = stringsToSelectOptions(ABSENCE_TYPES);

export default function AbsenceForm({
  initialData,
  employees,
  onSubmit,
  onCancel,
}: AbsenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  // ESTADOS DEL FORMULARIO
  const [userId, setUserId] = useState(initialData?.userId || "");
  const [type, setType] = useState<AbsenceType>(
    initialData?.type || "Enfermedad",
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  // 🌟 NUEVO: Unificamos inicio y fin en un solo estado de Rango
  const [dateRange, setDateRange] = useState<DateRange>({
    start: initialData?.startDate || "",
    end: initialData?.endDate || "",
  });

  // 🌟 NUEVO: Estado para los Inline Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!userId) newErrors.userId = "Debes seleccionar un empleado.";
    if (!type) newErrors.type = "El motivo de la ausencia es obligatorio.";
    if (!dateRange.start || !dateRange.end) {
      newErrors.dateRange = "Debes seleccionar el rango de fechas completo.";
    } else if (dateRange.start > dateRange.end) {
      newErrors.dateRange =
        "La fecha de fin no puede ser menor a la de inicio.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ejecutamos validación local antes de tocar la base de datos
    if (!validateForm()) {
      console.error("Faltan campos obligatorios");
      toast.error("Por favor, revisa los campos en rojo.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        userId,
        type,
        startDate: dateRange.start, // Desestructuramos el rango para mandarlo como espera tu backend
        endDate: dateRange.end,
        notes,
      });
    } catch (error) {
      console.error("Error al guardar el permiso:", error);
      toast.error("Hubo un error al guardar el permiso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
          <div className="bg-rose-50 p-1.5 rounded-md">
            <CalendarX size={16} className="text-rose-600" />
          </div>
          Detalles de la Ausencia
        </h4>

        <div className="grid grid-cols-1 gap-5">
          {/* EMPLEADO */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Empleado <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={userId}
              isSearchable
              onChange={(val) => {
                setUserId(val as string);
                if (errors.userId) setErrors({ ...errors, userId: "" }); // Limpia el error al escribir
              }}
              disabled={isEditing}
              options={employees
                .filter((e) => e.isActive !== false)
                .map((emp) => ({ value: emp.id, label: emp.fullName }))}
              placeholder="-- Seleccionar Empleado --"
              required
              error={errors.userId}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RANGO DE FECHAS (UNIFICADO) */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Fechas de Ausencia <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                mode="range"
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val as DateRange);
                  if (errors.dateRange) setErrors({ ...errors, dateRange: "" });
                }}
                placeholder="Inicio - Fin"
                required
                error={errors.dateRange}
              />
            </div>

            {/* TIPO DE AUSENCIA */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Motivo / Tipo <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={type}
                onChange={(val) => {
                  setType(val as AbsenceType);
                  if (errors.type) setErrors({ ...errors, type: "" });
                }}
                placeholder="-- Seleccionar Tipo --"
                options={absenceTypes}
                required
                error={errors.type}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100"></div>
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <FileText size={16} className="text-blue-600" />
          </div>
          Justificación / Notas (Opcional)
        </h4>
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Justificado con receta médica, dolor de estómago."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light resize-none"
          />
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
          {isEditing ? "Guardar Cambios" : "Registrar Permiso"}
        </button>
      </div>
    </form>
  );
}
