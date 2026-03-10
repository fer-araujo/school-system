import { useState, useEffect, useMemo } from "react";
import { ManageAbsences } from "../../application/use-cases/ManageAbsence";
import { ManageEmployees } from "../../application/use-cases/ManageEmployees";
import type { Absence } from "../../domain/models/Absence";
import type { User } from "../../domain/models/User";
import { Plus, Edit2, Trash2, CheckCircle2, FileWarning } from "lucide-react";
import type { AbsenceFormData } from "../components/admin/AbsenceForm";
import type { ColumnDef } from "../components/ui/DataTable";
import { getAvatarColor } from "../../utils/helpers";
import type { ActionMenuItem } from "../components/ui/ActionMenu";
import ActionMenu from "../components/ui/ActionMenu";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import AbsenceForm from "../components/admin/AbsenceForm";
import AdminPageHeader from "../components/ui/AdminPageHeader";
// 🌟 Importamos Toast y el ConfirmModal (Asegúrate de que la ruta del ConfirmModal sea correcta)
import toast from "react-hot-toast";
import ConfirmModal from "../components/ui/ConfirmModal";

import { FirebaseEmployeeRepository } from "../../infrastructure/repositories/FirebaseEmployeeRepository";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import { FirebaseAbsenceRepository } from "../../infrastructure/repositories/FirebaseAbsenceRepository";

const employeeRepo = new FirebaseEmployeeRepository();
const shiftRepo = new FirebaseShiftRepository();
const absenceRepo = new FirebaseAbsenceRepository();
const manageAbsences = new ManageAbsences(absenceRepo, employeeRepo);
const manageEmployees = new ManageEmployees(employeeRepo, shiftRepo);

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [absenceToEdit, setAbsenceToEdit] = useState<Absence | null>(null);

  // 🌟 Estados para el Modal de Confirmación de Eliminación
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [absData, empData] = await Promise.all([
        manageAbsences.getAllAbsences(),
        manageEmployees.getAllWorkers(),
      ]);
      setAbsences(absData);
      setEmployees(empData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los datos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setAbsenceToEdit(null);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (absence: Absence) => {
    setAbsenceToEdit(absence);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: AbsenceFormData) => {
    try {
      if (absenceToEdit && formData.id) {
        const absenceToUpdate: Absence = {
          id: formData.id,
          userId: formData.userId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
          employeeName: absenceToEdit.employeeName,
        };
        await manageAbsences.updateAbsence(absenceToUpdate);
        toast.success("Permiso actualizado correctamente."); // 🌟 Toast de éxito
      } else {
        await manageAbsences.createAbsence({
          userId: formData.userId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
        });
        toast.success("Permiso registrado correctamente."); // 🌟 Toast de éxito
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error al guardar permiso:", error);
      toast.error("Hubo un error al guardar el permiso."); // 🌟 Toast de error
    }
  };

  // 🌟 Lógica preparada para el ConfirmModal
  const confirmDelete = (id: string) => {
    setAbsenceToDelete(id);
    setIsConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!absenceToDelete) return;
    try {
      await manageAbsences.deleteAbsence(absenceToDelete);
      toast.success("Permiso eliminado correctamente."); // 🌟 Toast de éxito
      await loadData();
    } catch (error) {
      console.error("Error al eliminar permiso:", error);
      toast.error("Error al eliminar el permiso."); // 🌟 Toast de error
    } finally {
      setIsConfirmOpen(false);
      setAbsenceToDelete(null);
    }
  };

  const filteredAbsences = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return absences;
    return absences.filter((abs) => {
      return abs.startDate >= dateRange.start && abs.startDate <= dateRange.end;
    });
  }, [absences, dateRange]);

  const columns: ColumnDef<Absence>[] = [
    {
      header: "Empleado",
      sortable: true,
      accessorKey: "employeeName",
      className: "pl-6 w-[25%]",
      cell: (row) => {
        const name = row.employeeName || "Desconocido";
        const colorClass = getAvatarColor(name);
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 border rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${colorClass}`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-slate-800">{name}</span>
          </div>
        );
      },
    },
    {
      header: "Fechas",
      sortable: true,
      accessorKey: "startDate",
      className: "w-[20%]",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {row.startDate === row.endDate ? (
            <span className="font-medium text-slate-700">{row.startDate}</span>
          ) : (
            <>
              <span className="text-slate-500">
                Del:{" "}
                <span className="font-medium text-slate-700">
                  {row.startDate}
                </span>
              </span>
              <span className="text-slate-500">
                Al:{" "}
                <span className="font-medium text-slate-700">
                  {row.endDate}
                </span>
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      header: "Tipo",
      sortable: true,
      accessorKey: "type",
      className: "w-[20%]",
      cell: (row) => {
        const isBad = row.type === "Falta Injustificada";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${isBad ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
          >
            {isBad ? <FileWarning size={12} /> : <CheckCircle2 size={12} />}
            {row.type}
          </span>
        );
      },
    },
    {
      header: "Notas / Justificación",
      className: "max-w-[250px]",
      cell: (row) => (
        <p className="text-xs text-slate-500 truncate" title={row.notes}>
          {row.notes || (
            <span className="text-slate-300 italic">Sin notas</span>
          )}
        </p>
      ),
    },
    {
      header: "",
      className: "pr-6 text-right w-16",
      cell: (row) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: "Editar",
            icon: <Edit2 size={16} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: "Eliminar",
            icon: <Trash2 size={16} />,
            variant: "danger",
            // 🌟 Ahora llamamos a la función que abre el Modal en vez del window.confirm
            onClick: () => confirmDelete(row.id),
          },
        ];
        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800">
      <AdminPageHeader
        title="Permisos y Ausencias"
        description="Gestión de faltas, vacaciones y justificantes médicos."
        actionLabel="Registrar Ausencia"
        actionIcon={<Plus size={18} />}
        onAction={handleOpenCreateModal}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <DataTable
        columns={columns}
        data={filteredAbsences}
        isLoading={isLoading}
        loadingText="Cargando historial..."
        emptyText="No hay registros de ausencias para el mes seleccionado."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={absenceToEdit ? "Editar Permiso" : "Registrar Nueva Ausencia"}
      >
        <AbsenceForm
          initialData={absenceToEdit}
          employees={employees}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* 🌟 Inyectamos el ConfirmModal para las eliminaciones */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        isDanger
        title="Eliminar Permiso"
        message="¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer y afectará el conteo de asistencia del empleado."
        confirmText="Sí, eliminar"
      />
    </div>
  );
}
