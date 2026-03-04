import { useState } from "react";
import { Loader2, CalendarX, FileText } from "lucide-react";
import type { Absence, AbsenceType } from "../../../domain/models/Absence";
import type { User } from "../../../domain/models/User";

export type AbsenceFormData = Omit<Absence, "id" | "employeeName"> & {
  id?: string;
};

interface AbsenceFormProps {
  initialData?: Absence | null;
  employees: User[]; // Necesitamos la lista para el dropdown
  onSubmit: (data: AbsenceFormData) => Promise<void>;
  onCancel: () => void;
}

const ABSENCE_TYPES: AbsenceType[] = [
  "Enfermedad",
  "Vacaciones",
  "Permiso Personal",
  "Falta Injustificada",
];

export default function AbsenceForm({
  initialData,
  employees,
  onSubmit,
  onCancel,
}: AbsenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const [userId, setUserId] = useState(initialData?.userId || "");
  const [type, setType] = useState<AbsenceType>(
    initialData?.type || "Enfermedad",
  );
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toLocaleDateString("en-CA"),
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate || new Date().toLocaleDateString("en-CA"),
  );
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("Debes seleccionar un empleado.");
      return;
    }
    if (startDate > endDate) {
      alert("La fecha de fin no puede ser menor a la de inicio.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        userId,
        type,
        startDate,
        endDate,
        notes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
          <div className="bg-rose-50 p-1.5 rounded-md">
            <CalendarX size={16} className="text-rose-600" />
          </div>
          Detalles de la Ausencia
        </h4>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Empleado
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={isEditing}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light bg-white disabled:bg-slate-50"
            >
              <option value="">-- Seleccionar Empleado --</option>
              {employees
                .filter((e) => e.isActive !== false)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Desde
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-light"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Hasta
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-light"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Motivo / Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AbsenceType)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light bg-white"
            >
              {ABSENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
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
