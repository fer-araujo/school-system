import { useState } from "react";
import {
  Loader2,
  UserPlus,
  Users,
  Briefcase,
  Calendar,
  Phone,
  ScanBarcode, // 🌟 Ícono para el Badge
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  SCHOOL_DEPARTMENTS,
  SCHOOL_POSITIONS,
} from "../../../domain/constants/schoolConfig";
import type { User } from "../../../domain/models/User";
import type { Shift } from "../../../domain/models/Shift";
import CustomSelect from "../ui/CustomSelect";
import CustomDatePicker from "../ui/CustomDatePicker";
import { stringsToSelectOptions } from "../../../utils/helpers";

export interface EmployeeFormData {
  id?: string;
  empNo?: string;
  fullName: string;
  email?: string; // Ahora es opcional
  phone?: string; // Ahora es opcional
  department: string;
  position: string;
  selectedShiftId: string;
  validFrom: string;
  badgeId: string; // 🌟 NUEVO Y OBLIGATORIO
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
  const [badgeId, setBadgeId] = useState(initialData?.badgeId || ""); // 🌟 ESTADO DEL BADGE
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [department, setDepartment] = useState(initialData?.department || "");
  const [position, setPosition] = useState(initialData?.position || "");
  const [selectedShiftId, setSelectedShiftId] = useState(
    initialData?.shiftId || "",
  );
  const [validFrom, setValidFrom] = useState(
    new Date().toLocaleDateString("en-CA"),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const schoolDepartments = stringsToSelectOptions(SCHOOL_DEPARTMENTS);
  const schoolPositions = stringsToSelectOptions(SCHOOL_POSITIONS);
  const shiftOptions = shifts.map((s) => ({ value: s.id, label: s.name }));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "El nombre es obligatorio.";
    if (!badgeId.trim())
      newErrors.badgeId = "El código del gafete es obligatorio.";
    if (!department) newErrors.department = "Selecciona un área.";
    if (!position) newErrors.position = "Selecciona un puesto.";
    if (selectedShiftId && !validFrom)
      newErrors.validFrom = "Indica desde cuándo aplica este turno.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor, revisa los campos marcados en rojo.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        empNo,
        fullName,
        badgeId,
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

  const clearError = (field: string) => {
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
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
              Nombre Completo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError("fullName");
              }}
              className={`w-full px-3 py-2 border rounded-lg outline-none text-sm font-light ${errors.fullName ? "border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10" : "border-slate-200 focus:ring-1 focus:ring-blue-500"}`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-rose-500 mt-1 pl-1">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* 🌟 INPUT DEL GAFETE */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              ID del Gafete Físico <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <ScanBarcode
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.badgeId ? "text-rose-400" : "text-slate-400"}`}
              />
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => {
                  setBadgeId(e.target.value);
                  clearError("badgeId");
                }}
                placeholder="Escanea el gafete aquí..."
                className={`w-full pl-9 pr-3 py-2 border rounded-lg outline-none text-sm font-light ${errors.badgeId ? "border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10" : "border-slate-200 focus:ring-1 focus:ring-blue-500"}`}
              />
            </div>
            {errors.badgeId ? (
              <p className="text-[11px] text-rose-500 mt-1 pl-1">
                {errors.badgeId}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1 pl-1">
                Haz clic en el campo y pasa el gafete por el lector.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Correo Electrónico{" "}
              <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Teléfono / WhatsApp{" "}
              <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 dígitos"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-sm font-light"
              />
            </div>
          </div>
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
              Puesto / Rol <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={position}
              onChange={(val) => {
                setPosition(val as string);
                clearError("position");
              }}
              placeholder="-- Seleccionar Puesto --"
              options={schoolPositions}
              isSearchable
              required
              error={errors.position}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Área / Nivel <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={department}
              onChange={(val) => {
                setDepartment(val as string);
                clearError("department");
              }}
              placeholder="-- Seleccionar Área --"
              options={schoolDepartments}
              isSearchable
              required
              error={errors.department}
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
            <CustomDatePicker
              mode="single"
              value={validFrom}
              onChange={(val) => {
                setValidFrom(val as string);
                clearError("validFrom");
              }}
              disabled={!selectedShiftId}
              error={errors.validFrom}
            />
          </div>
        </div>
      </div>

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
