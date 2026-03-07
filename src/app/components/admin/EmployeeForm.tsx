import { useState } from "react";
import {
  Loader2,
  UserPlus,
  Users,
  Briefcase,
  Calendar,
  Phone,
} from "lucide-react";
import {
  SCHOOL_DEPARTMENTS,
  SCHOOL_POSITIONS,
} from "../../../domain/constants/schoolConfig";
import type { User } from "../../../domain/models/User";
import type { Shift } from "../../../domain/models/Shift";
import CustomSelect from "../ui/CustomSelect";
import { stringsToSelectOptions } from "../../../utils/helpers";

export interface EmployeeFormData {
  id?: string;
  empNo?: string;
  fullName: string;
  email: string;
  phone: string; // <--- NUEVO CAMPO
  department: string;
  position: string;
  selectedShiftId: string;
  validFrom: string;
}

interface EmployeeFormProps {
  initialData?: User | null;
  shifts: Shift[];
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
}

export default function EmployeeForm({
  initialData,
  shifts,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const [empNo] = useState(initialData?.employeeNumber || "");
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || ""); // <--- NUEVO ESTADO
  const [department, setDepartment] = useState(initialData?.department || "");
  const [position, setPosition] = useState(initialData?.position || "");

  const [selectedShiftId, setSelectedShiftId] = useState(
    initialData?.shiftId || "",
  );
  const [validFrom, setValidFrom] = useState(
    new Date().toLocaleDateString("en-CA"),
  );

  const schoolDepartments = stringsToSelectOptions(SCHOOL_DEPARTMENTS);
  const schoolPositions = stringsToSelectOptions(SCHOOL_POSITIONS);
  const shiftOptions = shifts.map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        empNo,
        fullName,
        email,
        phone,
        department,
        position,
        selectedShiftId,
        validFrom,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Identificación */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-4">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <Users size={16} className="text-blue-600" />
          </div>
          1. Identificación
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
            />
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                No. Empleado
              </label>
              <input
                type="text"
                value={empNo}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-mono bg-slate-50 text-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Correo (Usuario)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-light disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* NUEVO CAMPO DE TELÉFONO */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Teléfono (WhatsApp)
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 dígitos"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
              />
            </div>
          </div>

          {/* ¡CONTRASEÑA ELIMINADA DE AQUÍ! */}
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* 2. Perfil Laboral */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-4">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <Briefcase size={16} className="text-blue-600" />
          </div>
          2. Perfil Laboral
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Puesto / Rol
            </label>
            <CustomSelect
              value={position}
              onChange={(val) => setPosition(val as string)}
              placeholder="-- Seleccionar Puesto --"
              options={schoolPositions}
              isSearchable
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Área / Nivel
            </label>
            <CustomSelect
              value={department}
              onChange={(val) => setDepartment(val as string)}
              placeholder="-- Seleccionar Área --"
              options={schoolDepartments}
              isSearchable
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* 3. Turno */}
      <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100/60">
        <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
          <div className="bg-blue-50 p-1.5 rounded-md">
            <Calendar size={16} className="text-blue-600" />
          </div>
          3.{" "}
          {isEditing
            ? "Cambiar Turno Actual"
            : "Asignación de Turno (Opcional)"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Turno del Catálogo
            </label>
            <CustomSelect
              value={selectedShiftId}
              onChange={(val) => setSelectedShiftId(val as string)}
              placeholder="-- Seleccionar Turno --"
              options={shiftOptions}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Válido Desde
            </label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              disabled={!selectedShiftId}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-light disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="pt-2 flex items-center justify-end gap-3">
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
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isEditing ? null : (
            <UserPlus size={16} />
          )}
          {isEditing ? "Guardar Cambios" : "Crear Empleado"}
        </button>
      </div>
    </form>
  );
}
