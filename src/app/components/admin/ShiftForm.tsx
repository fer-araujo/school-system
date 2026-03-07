import { useState } from "react";
import {
  Loader2,
  Clock,
  Plus,
  Trash2,
  CalendarDays,
  Settings2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Shift, TimeBlock } from "../../../domain/models/Shift";
import { WEEK_DAYS } from "../../../domain/constants/schoolConfig";

export type ShiftFormData = Omit<Shift, "id"> & { id?: string };

interface ShiftFormProps {
  initialData?: Shift | null;
  onSubmit: (data: ShiftFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ShiftForm({
  initialData,
  onSubmit,
  onCancel,
}: ShiftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [toleranceMinutes, setToleranceMinutes] = useState(
    initialData?.toleranceMinutes || 15,
  );
  const [workDays, setWorkDays] = useState<string[]>(
    initialData?.workDays || [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
    ],
  );

  const [blocks, setBlocks] = useState<TimeBlock[]>(
    initialData?.blocks && initialData.blocks.length > 0
      ? initialData.blocks
      : [{ start: "08:00", end: "14:00" }],
  );

  // 🌟 ESTADO PARA INLINE ERRORS
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // --- LÓGICA DE DÍAS Y BLOQUES ---
  const toggleDay = (dayId: string) => {
    setWorkDays((prev) => {
      const next = prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId];
      if (next.length > 0) clearError("workDays"); // Limpia el error si ya seleccionó uno
      return next;
    });
  };

  const handleAddBlock = () => {
    setBlocks([...blocks, { start: "15:00", end: "18:00" }]);
    clearError("blocks");
  };

  const handleRemoveBlock = (indexToRemove: number) => {
    setBlocks(blocks.filter((_, index) => index !== indexToRemove));
    clearError(`block_${indexToRemove}`);
  };

  const handleBlockChange = (
    index: number,
    field: keyof TimeBlock,
    value: string,
  ) => {
    const newBlocks = [...blocks];
    newBlocks[index][field] = value;
    setBlocks(newBlocks);
    clearError(`block_${index}`); // Limpia el error de ese bloque en particular
  };

  // 🌟 VALIDACIÓN COMPLETA ANTES DE ENVIAR
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "El nombre del turno es obligatorio.";

    if (workDays.length === 0) {
      newErrors.workDays = "Debes seleccionar al menos un día laborable.";
    }

    if (blocks.length === 0) {
      newErrors.blocks = "Debes agregar al menos un bloque de horario.";
    } else {
      // Validar cada bloque individualmente
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b.start || !b.end) {
          newErrors[`block_${i}`] = "Completa ambas horas del bloque.";
        } else if (b.start >= b.end) {
          newErrors[`block_${i}`] = "La salida debe ser después de la entrada.";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, revisa los campos en rojo.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        name,
        toleranceMinutes,
        workDays,
        blocks,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* 1. Datos Generales */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-4">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <Settings2 size={16} className="text-blue-600" />
          </div>
          1. Configuración General
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Nombre del Turno <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              placeholder="Ej. Tallerista Mixto"
              className={`w-full px-3 py-2 border rounded-lg outline-none text-sm font-light transition-colors ${
                errors.name
                  ? "border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10"
                  : "border-slate-200 focus:ring-1 focus:ring-blue-500"
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1 pl-1">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Minutos de Tolerancia (Retardo){" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={toleranceMinutes}
              onChange={(e) => setToleranceMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* 2. Días de la semana */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-4">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <CalendarDays size={16} className="text-blue-600" />
          </div>
          2. Días Laborables
        </h4>
        <div className="flex flex-wrap gap-3">
          {WEEK_DAYS.map((day) => {
            const isSelected = workDays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title={day.id}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        {errors.workDays && (
          <p className="text-[11px] text-rose-500 mt-1 pl-1">
            {errors.workDays}
          </p>
        )}
      </div>

      <div className="border-t border-slate-100"></div>

      {/* 3. Bloques de Horario Dinámicos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <div className="bg-blue-50 p-1.5 rounded-md">
              <Clock size={16} className="text-blue-600" />
            </div>
            3. Bloques de Horario
          </h4>
          <button
            type="button"
            onClick={handleAddBlock}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Plus size={14} /> Agregar Bloque
          </button>
        </div>

        {errors.blocks && (
          <p className="text-[11px] text-rose-500 mt-1 pl-1 mb-2">
            {errors.blocks}
          </p>
        )}

        <div className="space-y-3">
          {blocks.map((block, index) => {
            const blockError = errors[`block_${index}`];
            return (
              <div
                key={index}
                className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
                  blockError
                    ? "bg-rose-50/20 border-rose-200 ring-1 ring-rose-500/30"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-4 group">
                  <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">
                        Entrada
                      </label>
                      <input
                        type="time"
                        required
                        value={block.start}
                        onChange={(e) =>
                          handleBlockChange(index, "start", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none text-sm font-light bg-white ${
                          blockError
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-blue-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">
                        Salida
                      </label>
                      <input
                        type="time"
                        required
                        value={block.end}
                        onChange={(e) =>
                          handleBlockChange(index, "end", e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-1 outline-none text-sm font-light bg-white ${
                          blockError
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-blue-500"
                        }`}
                      />
                    </div>
                  </div>
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(index)}
                      className="mt-5 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar este bloque"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                {blockError && (
                  <p className="text-[11px] text-rose-500 font-medium pl-1">
                    {blockError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones */}
      <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
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
          {isEditing ? "Guardar Cambios" : "Crear Turno"}
        </button>
      </div>
    </form>
  );
}
