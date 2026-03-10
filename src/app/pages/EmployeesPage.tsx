import { useState, useEffect, useMemo } from "react";
import { ManageEmployees } from "../../application/use-cases/ManageEmployees";
import { ManageShifts } from "../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import type { User } from "../../domain/models/User";
import type { Shift } from "../../domain/models/Shift";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Plus,
  ArrowUp,
  ArrowUpDown,
  ArrowDown,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  TrendingUp,
} from "lucide-react";

// Componentes UI Extrayendo lógica
import Modal from "../components/ui/Modal";
import EmployeeForm, {
  type EmployeeFormData,
} from "../components/admin/EmployeeForm";
import DataTable, { type ColumnDef } from "../components/ui/DataTable";
import ActionMenu, { type ActionMenuItem } from "../components/ui/ActionMenu";
import EmployeeProfile from "../components/admin/EmployeeProfile";
import ConfirmModal from "../components/ui/ConfirmModal";
import SelectionToolbar from "../components/ui/SelectionToolbar";

// Helpers
import { getAvatarColor } from "../../utils/helpers";
import AdminPageHeader from "../components/ui/AdminPageHeader";
import Checkbox from "../components/ui/Checkbox";
import { FirebaseEmployeeRepository } from "../../infrastructure/repositories/FirebaseEmployeeRepository";

const employeeRepo = new FirebaseEmployeeRepository();
const shiftRepo = new FirebaseShiftRepository();
const manageEmployees = new ManageEmployees(employeeRepo, shiftRepo);
const manageShifts = new ManageShifts(shiftRepo);

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);

  // Modal de Confirmación Interno (Refactorizado a componente extraído)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText: string;
    isDanger: boolean;
    isProcessing: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    isDanger: false,
    isProcessing: false,
    onConfirm: async () => {},
  });

  // Estado Selección Múltiple
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedShiftIdMassive, setSelectedShiftIdMassive] = useState("");
  const [isAssigningMassive, setIsAssigningMassive] = useState(false);

  // Búsqueda y Ordenamiento
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: "asc" | "desc";
  } | null>(null);

  // Memo para Búsqueda y Ordenamiento
  const processedEmployees = useMemo(() => {
    let result = [...employees];

    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (emp) =>
          emp.fullName.toLowerCase().includes(lowerQuery) ||
          emp.department?.toLowerCase().includes(lowerQuery) ||
          emp.position?.toLowerCase().includes(lowerQuery) ||
          emp.employeeNumber?.toLowerCase().includes(lowerQuery),
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key] || "").toLowerCase();
        const bValue = String(b[sortConfig.key] || "").toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [employees, searchQuery, sortConfig]);

  // Carga inicial de datos
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workers, catalog] = await Promise.all([
        manageEmployees.getAllWorkers(),
        manageShifts.getCatalog(),
      ]);
      setEmployees(workers);
      setShifts(catalog);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al cargar directorio: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- HANDLERS DE INTERFAZ ---
  const handleSort = (key: keyof User) => {
    setSortConfig((prev) => {
      if (prev?.key === key)
        return prev.direction === "asc" ? { key, direction: "desc" } : null;
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedUserIds(checked ? processedEmployees.map((emp) => emp.id) : []);
  };

  const handleToggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({
      ...prev,
      isOpen: false,
      isProcessing: false,
    }));
  };

  // --- HANDLERS DE NEGOCIO ---
  const handleMassiveShiftAssignment = async () => {
    if (!selectedShiftIdMassive) return;
    setIsAssigningMassive(true);

    const assignPromise = Promise.all(
      selectedUserIds.map((uid) =>
        manageShifts.assignToUser(
          uid,
          selectedShiftIdMassive,
          new Date().toLocaleDateString("en-CA"),
        ),
      ),
    );

    toast
      .promise(assignPromise, {
        loading: "Asignando turnos masivamente...",
        success: `¡Turno asignado a ${selectedUserIds.length} empleados!`,
        error: "Hubo un error al asignar los turnos.",
      })
      .then(async () => {
        setSelectedUserIds([]);
        setSelectedShiftIdMassive("");
        await loadData();
      })
      .finally(() => {
        setIsAssigningMassive(false);
      });
  };

  const handleToggleStatus = (employee: User) => {
    const isDeactivating = employee.isActive !== false;

    setConfirmDialog({
      isOpen: true,
      title: isDeactivating ? "Dar de baja empleado" : "Reactivar empleado",
      message: `¿Estás seguro de que deseas ${isDeactivating ? "dar de baja" : "reactivar"} a ${employee.fullName}?`,
      confirmText: isDeactivating ? "Dar de baja" : "Reactivar",
      isDanger: isDeactivating,
      isProcessing: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isProcessing: true }));
        try {
          await manageEmployees.toggleEmployeeStatus(
            employee.id,
            employee.isActive ?? true,
          );
          await loadData();
          toast.success(
            `Empleado ${isDeactivating ? "dado de baja" : "reactivado"} exitosamente.`,
          );
          closeConfirmDialog();
        } catch (error: unknown) {
          toast.error(
            `${error instanceof Error ? error.message : "Error al actualizar el estado del empleado."}`,
          );
          setConfirmDialog((prev) => ({ ...prev, isProcessing: false }));
        }
      },
    });
  };

  const handleHardDelete = (employee: User) => {
    setConfirmDialog({
      isOpen: true,
      title: "⚠️ Eliminar Permanentemente",
      message: (
        <div className="space-y-2">
          <p>
            ¿Estás absolutamente seguro de eliminar a{" "}
            <strong>{employee.fullName}</strong>?
          </p>
          <p className="text-sm text-rose-600 font-medium">
            Esta acción es irreversible y borrará todo su registro del sistema.
          </p>
        </div>
      ),
      confirmText: "Eliminar definitivamente",
      isDanger: true,
      isProcessing: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isProcessing: true }));
        try {
          await manageEmployees.deleteEmployeeFromDatabase(employee.id);
          await loadData();
          toast.success("Empleado eliminado permanentemente.");
          closeConfirmDialog();
        } catch (error: unknown) {
          toast.error(
            `${error instanceof Error ? error.message : "Hubo un error al intentar eliminar el registro del empleado."}`,
          );
          setConfirmDialog((prev) => ({ ...prev, isProcessing: false }));
        }
      },
    });
  };

  const handleFormSubmit = async (formData: EmployeeFormData) => {
    try {
      if (employeeToEdit) {
        await manageEmployees.updateEmployee(formData);

        // Si cambió de turno, lo registramos en el historial
        if (
          formData.selectedShiftId &&
          formData.selectedShiftId !== employeeToEdit.shiftId
        ) {
          await manageShifts.assignToUser(
            employeeToEdit.id,
            formData.selectedShiftId,
            formData.validFrom,
          );
        }
        toast.success("Perfil actualizado correctamente.");
      } else {
        // 🌟 MODO CREACIÓN (CON GAFETES)
        const newUid = await manageEmployees.createEmployee(formData);

        // Si le asignaron un turno desde la creación, lo registramos en el historial
        if (formData.selectedShiftId && formData.validFrom) {
          await manageShifts.assignToUser(
            newUid,
            formData.selectedShiftId,
            formData.validFrom,
          );
        }

        // Adiós al Toast VIP, hola al Toast estándar corporativo
        toast.success("Empleado creado y Gafete vinculado exitosamente.");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error al guardar el empleado";
      toast.error(msg);
    }
  };

  const handleOpenCreateModal = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee: User) => {
    setEmployeeToEdit(employee);
    setIsModalOpen(true);
  };

  const renderSortIcon = (key: keyof User) => {
    if (sortConfig?.key !== key)
      return (
        <ArrowUpDown
          size={14}
          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      );
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="text-blue-500" />
    ) : (
      <ArrowDown size={14} className="text-blue-500" />
    );
  };

  // --- DEFINICIÓN DE COLUMNAS DATATABLE ---
  const columns: ColumnDef<User>[] = [
    {
      header: (
        <Checkbox
          checked={
            processedEmployees.length > 0 &&
            selectedUserIds.length === processedEmployees.length
          }
          onChange={(e) => handleSelectAll(e)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      ),
      className: "pl-6 w-12",
      cell: (row: User) => (
        <Checkbox
          checked={selectedUserIds.includes(row.id)}
          onChange={() => handleToggleUser(row.id)}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort("fullName")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors cursor-pointer"
        >
          Empleado {renderSortIcon("fullName")}
        </button>
      ),
      cell: (row: User) => {
        const colorClass = getAvatarColor(row.fullName);
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 border rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${colorClass}`}
            >
              {row.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-slate-800">{row.fullName}</div>
              <div className="text-[11px] text-slate-400 font-light mt-0.5">
                {row.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "No. Emp.",
      accessorKey: "employeeNumber",
    },
    {
      header: (
        <button
          onClick={() => handleSort("position")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors cursor-pointer"
        >
          Puesto / Nivel {renderSortIcon("position")}
        </button>
      ),
      cell: (row: User) => (
        <>
          <div className="text-slate-700 font-medium text-sm">
            {row.position || "Sin asignar"}
          </div>
          <div className="text-[11px] text-slate-400 font-light mt-0.5">
            {row.department || "---"}
          </div>
        </>
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort("shiftName")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors cursor-pointer"
        >
          Turno Asignado {renderSortIcon("shiftName")}
        </button>
      ),
      accessorKey: "shiftName",
      cell: (row: User) => (
        <span className="text-slate-600 text-xs font-medium bg-slate-200/80 px-2.5 py-1.5 rounded-md border border-slate-200/60">
          {row.shiftName || "Sin turno"}
        </span>
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort("isActive")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors cursor-pointer"
        >
          Estado {renderSortIcon("isActive")}
        </button>
      ),
      cell: (row: User) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium border ${row.isActive !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
        >
          {row.isActive !== false ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      header: "",
      className: "pr-6 text-right",
      cell: (row: User) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: "Editar Perfil",
            icon: <Edit2 size={16} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: "Ver Expediente",
            icon: <TrendingUp size={16} />,
            onClick: () => {
              setUserToView(row);
              setIsProfileModalOpen(true);
            },
          },
        ];

        if (row.isActive !== false) {
          menuItems.push({
            label: "Dar de Baja",
            icon: <UserX size={16} />,
            variant: "danger",
            onClick: () => handleToggleStatus(row),
          });
        } else {
          menuItems.push({
            label: "Reactivar",
            icon: <UserCheck size={16} />,
            variant: "success",
            onClick: () => handleToggleStatus(row),
          });
          menuItems.push({
            label: "Eliminar Permanente",
            icon: <Trash2 size={16} />,
            variant: "danger",
            onClick: () => handleHardDelete(row),
          });
        }

        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800 relative">
      <AdminPageHeader
        title="Gestión de Personal"
        description="Directorio de empleados, altas y asignación de turnos."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar (Nombre, Puesto)..."
        actionLabel="Nuevo Empleado"
        actionIcon={<Plus size={18} />}
        onAction={handleOpenCreateModal}
      />

      <div className="space-y-6 relative">
        {/* COMPONENTE REUTILIZABLE CON ACCIONES INYECTADAS */}
        <SelectionToolbar
          selectedCount={selectedUserIds.length}
          onClearSelection={() => setSelectedUserIds([])}
        >
          <select
            value={selectedShiftIdMassive}
            onChange={(e) => setSelectedShiftIdMassive(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-400 outline-none font-medium min-w-45 hover:bg-white transition-colors cursor-pointer"
          >
            <option value="">-- Asignar Turno --</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            disabled={!selectedShiftIdMassive || isAssigningMassive}
            onClick={handleMassiveShiftAssignment}
            className="px-5 py-2 bg-slate-900 text-white font-medium rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
          >
            {isAssigningMassive && <Loader2 className="w-4 h-4 animate-spin" />}
            Vincular
          </button>
        </SelectionToolbar>

        <DataTable
          columns={columns}
          data={processedEmployees}
          isLoading={isLoading}
          loadingText="Cargando directorio..."
          isEmpty={processedEmployees.length === 0}
          emptyText={
            searchQuery
              ? "No se encontraron empleados con esa búsqueda."
              : "El directorio está vacío. Haz clic en 'Nuevo Empleado' para comenzar."
          }
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={employeeToEdit ? "Editar Personal" : "Registrar Nuevo Personal"}
      >
        <EmployeeForm
          initialData={employeeToEdit}
          shifts={shifts}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Expediente del Empleado"
      >
        {userToView && <EmployeeProfile user={userToView} />}
      </Modal>

      <ConfirmModal {...confirmDialog} onClose={closeConfirmDialog} />
    </div>
  );
}
