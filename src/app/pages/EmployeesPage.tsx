import { useState, useEffect, useMemo } from "react";
import { ManageEmployees } from "../../application/use-cases/ManageEmployees";
import { ManageShifts } from "../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import type { User } from "../../domain/models/User";
import type { Shift } from "../../domain/models/Shift";
import {
  Loader2,
  Plus,
  Search,
  X,
  Users,
  ArrowUp,
  ArrowUpDown,
  ArrowDown,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
} from "lucide-react";
import Modal from "../components/ui/Modal";
import EmployeeForm, {
  type EmployeeFormData,
} from "../components/admin/EmployeeForm";
import DataTable, { type ColumnDef } from "../components/ui/DataTable";
import type { ActionMenuItem } from "../components/ui/ActionMenu";
import ActionMenu from "../components/ui/ActionMenu";
import { getAvatarColor } from "../../utils/helpers";

// Componentes importados

const manageEmployees = new ManageEmployees();
const shiftRepo = new FirebaseShiftRepository();
const manageShifts = new ManageShifts(shiftRepo);

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<User | null>(null);

  // Estado Selección Múltiple
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedShiftIdMassive, setSelectedShiftIdMassive] = useState("");
  const [isAssigningMassive, setIsAssigningMassive] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: "asc" | "desc";
  } | null>(null);

  const processedEmployees = useMemo(() => {
    let result = [...employees];

    // 1. Filtrar por búsqueda
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

    // 2. Ordenar
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

  // --- HANDLERS DE ORDENAMIENTO Y SELECCIÓN ---
  const handleSort = (key: keyof User) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null; // asc -> desc -> sin orden
      }
      return { key, direction: "asc" };
    });
  };

  // El Master Checkbox (Select All de los visibles)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Selecciona solo los que están filtrados actualmente
      setSelectedUserIds(
        processedEmployees.map((emp: { id: string }) => emp.id),
      );
    } else {
      setSelectedUserIds([]);
    }
  };

  // Helper para renderizar iconos de sort
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

  // Función que ejecuta el cambio masivo
  const handleMassiveShiftAssignment = async () => {
    if (!selectedShiftIdMassive) return;

    setIsAssigningMassive(true);
    try {
      // Usamos Promise.all para disparar todas las asignaciones a Firebase al mismo tiempo
      await Promise.all(
        selectedUserIds.map((uid) =>
          manageShifts.assignToUser(
            uid,
            selectedShiftIdMassive,
            new Date().toLocaleDateString("en-CA"),
          ),
        ),
      );

      alert(
        `¡Éxito! Se ha asignado el turno a ${selectedUserIds.length} empleados de golpe.`,
      );

      // Limpiamos la selección
      setSelectedUserIds([]);
      setSelectedShiftIdMassive("");
      await loadData(); // Recarga la tabla para mostrar los nuevos turnos
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error inesperado";
      alert(`Ocurrió un error: ${errorMessage}`);
    } finally {
      setIsAssigningMassive(false);
    }
  };

  // Función para marcar/desmarcar checkboxes (si no la tenías ya exacta así)
  const handleToggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleToggleStatus = async (employee: User) => {
    const action = employee.isActive !== false ? "dar de baja" : "reactivar";
    const confirm = window.confirm(
      `¿Estás seguro de que deseas ${action} a ${employee.fullName}?`,
    );

    if (!confirm) return;

    try {
      await manageEmployees.toggleEmployeeStatus(
        employee.id,
        employee.isActive ?? true,
      );
      await loadData(); // Recargamos la tabla
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Hubo un error al actualizar el estado: ${errorMessage}`);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workers, catalog] = await Promise.all([
        manageEmployees.getAllWorkers(),
        manageShifts.getCatalog(),
      ]);
      setEmployees(workers);
      setShifts(catalog);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- HANDLERS DEL MODAL ---
  const handleOpenCreateModal = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee: User) => {
    setEmployeeToEdit(employee);
    setIsModalOpen(true);
  };

  // --- SUBMIT DEL FORMULARIO (Maneja Crear y Editar) ---
  const handleFormSubmit = async (formData: EmployeeFormData) => {
    try {
      if (employeeToEdit) {
        await manageEmployees.updateEmployee(formData);

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
        alert("Perfil actualizado correctamente.");
      } else {
        // MODO CREACIÓN: Recibimos las credenciales generadas
        const { uid, empNo, tempPass } =
          await manageEmployees.createEmployee(formData);

        if (formData.selectedShiftId && formData.validFrom) {
          await manageShifts.assignToUser(
            uid,
            formData.selectedShiftId,
            formData.validFrom,
          );
        }

        // --- MAGIA PARA COMPARTIR POR WHATSAPP/CORREO ---
        const mensaje = `Hola ${formData.fullName}, bienvenida al sistema de la escuela.\n\n*Tus credenciales de acceso son:*\nUsuario: ${formData.email}\nContraseña: ${tempPass}\nTu número de empleada es: ${empNo}\n\nPor favor, cambia tu contraseña al ingresar.`;

        // Codificamos el mensaje para que funcione en una URL
        const encodedMessage = encodeURIComponent(mensaje);
        const whatsappUrl = `https://wa.me/${formData.phone}?text=${encodedMessage}`;
        const mailtoUrl = `mailto:${formData.email}?subject=Tus Credenciales de Acceso&body=${encodedMessage}`;

        // Le preguntamos al Admin si quiere enviarlo por WhatsApp ahora
        const sendWhatsapp = window.confirm(
          `Empleado ${empNo} creado con la contraseña: ${tempPass}\n\n¿Deseas enviarle sus credenciales por WhatsApp en este momento?`,
        );

        if (sendWhatsapp) {
          window.open(whatsappUrl, "_blank"); // Abre WhatsApp Web o la App
        } else {
          // O por correo
          const sendMail = window.confirm(
            "¿Prefieres enviarlo por correo electrónico?",
          );
          if (sendMail) window.open(mailtoUrl, "_blank");
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error inesperado";
      alert(`Error al guardar: ${errorMessage}`);
    }
  };

  const handleHardDelete = async (employee: User) => {
    const confirm = window.confirm(
      `⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de eliminar a ${employee.fullName}?\nEsta acción es irreversible y borrará todo su registro del sistema.\n\n(Nota: El sistema está configurado para depurar cuentas inactivas automáticamente después de 3 meses).`,
    );

    if (!confirm) return;

    try {
      await manageEmployees.deleteEmployeeFromDatabase(employee.id);
      await loadData();
      alert("Empleado eliminado permanentemente.");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Hubo un error al intentar eliminar el registro: ${errorMessage}`);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            processedEmployees.length > 0 &&
            selectedUserIds.length === processedEmployees.length
          }
          onChange={handleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          title="Seleccionar todos los visibles"
        />
      ),
      className: "pl-6 w-12",
      cell: (row: User) => (
        <input
          type="checkbox"
          checked={selectedUserIds.includes(row.id)}
          onChange={() => handleToggleUser(row.id)}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      // HEADER ORDENABLE
      header: (
        <button
          onClick={() => handleSort("fullName")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors uppercase cursor-pointer"
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
      className: "font-mono text-xs text-slate-600", // Dato plano con estilo
    },
    {
      // HEADER ORDENABLE
      header: (
        <button
          onClick={() => handleSort("position")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors uppercase cursor-pointer"
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
      //COLUMNA ORDENABLE: TURNO
      header: (
        <button
          onClick={() => handleSort("shiftName")}
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors uppercase cursor-pointer"
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
          className="flex items-center gap-1.5 hover:text-slate-700 group transition-colors uppercase cursor-pointer"
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
      header: "", // Columna de acciones
      className: "pr-6 text-right",
      cell: (row: User) => {
        // LÓGICA CONDICIONAL DEL MENÚ
        const menuItems: ActionMenuItem[] = [
          {
            label: "Editar Perfil",
            icon: <Edit2 size={16} />,
            onClick: () => handleOpenEditModal(row),
          },
        ];

        // Si está ACTIVO: Solo mostramos 'Dar de Baja'
        if (row.isActive !== false) {
          menuItems.push({
            label: "Dar de Baja",
            icon: <UserX size={16} />,
            variant: "danger",
            onClick: () => handleToggleStatus(row),
          });
        }
        // Si está INACTIVO: Mostramos 'Reactivar' y 'Eliminar Permanente'
        else {
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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800 relative">
      {/* HEADER LIMPIO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
            Gestión de Personal
          </h1>
          <p className="text-slate-500 mt-1 font-normal">
            Directorio de empleados, altas y asignación de turnos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* EL BUSCADOR AHORA ES FUNCIONAL */}
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
            <input
              type="text"
              placeholder="Buscar (Nombre, Puesto, Depto)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-sm font-light focus:ring-1 focus:ring-blue-500 outline-none w-72 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Nuevo Empleado
          </button>
        </div>
      </div>

      <div className="space-y-6 relative">
        {/* BARRA DE ACCIONES MASIVAS: GLASSMORPHISM LIGHT */}
        {selectedUserIds.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 fade-in duration-300 sticky top-4 z-20">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100/50">
                <Users size={20} />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedUserIds.length} empleados seleccionados
                </span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Listos para acción masiva
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedShiftIdMassive}
                onChange={(e) => setSelectedShiftIdMassive(e.target.value)}
                className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-400 outline-none font-medium min-w-45 hover:bg-white transition-colors"
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
                className="px-5 py-2 bg-slate-900 text-white font-medium rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm"
              >
                {isAssigningMassive && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Vincular
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1"></div>

              <button
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Cancelar selección"
                onClick={() => setSelectedUserIds([])}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* 2. DATAGRID CON LOS DATOS FILTRADOS */}
        <DataTable
          columns={columns}
          data={processedEmployees} // <-- PASAMOS LOS DATOS YA FILTRADOS Y ORDENADOS
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
    </div>
  );
}
