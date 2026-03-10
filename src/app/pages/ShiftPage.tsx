import { useState, useEffect } from "react";
import { ManageShifts } from "../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import type { Shift } from "../../domain/models/Shift";
import { Plus, Edit2, Trash2, Clock } from "lucide-react";
import DataTable, { type ColumnDef } from "../components/ui/DataTable";
import type { ActionMenuItem } from "../components/ui/ActionMenu";
import ActionMenu from "../components/ui/ActionMenu";
import Modal from "../components/ui/Modal";
import ShiftForm, { type ShiftFormData } from "../components/admin/ShiftForm";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";
import AdminPageHeader from "../components/ui/AdminPageHeader";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ui/ConfirmModal"; // 🌟 Asegúrate de que la ruta sea correcta

const shiftRepo = new FirebaseShiftRepository();
const manageShifts = new ManageShifts(shiftRepo);

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await manageShifts.getCatalog();
      setShifts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setShiftToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: Shift) => {
    setShiftToEdit(shift);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: ShiftFormData) => {
    try {
      // Mantenemos el parche para que no rompa la validación vieja si aún la tienes
      const dataToSave = { ...formData, blocks: formData.blocksByDay || [] };

      if (shiftToEdit) {
        await manageShifts.updateShift(dataToSave as Shift);
        toast.success("Turno actualizado correctamente.");
      } else {
        await manageShifts.createShift(dataToSave as Shift);
        toast.success("Turno creado correctamente.");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al guardar el turno: ${errorMessage}`);
    }
  };

  // 🌟 Solo abre el modal y guarda el ID
  const handleDelete = (id: string) => {
    setShiftToDelete(id);
    setIsConfirmOpen(true);
  };

  // 🌟 Ejecuta la eliminación real cuando el usuario confirma en el modal
  const executeDelete = async () => {
    if (!shiftToDelete) return;
    try {
      await manageShifts.deleteShift(shiftToDelete);
      toast.success("Turno eliminado correctamente.");
      await loadData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar el turno: ${errorMessage}`);
    } finally {
      setIsConfirmOpen(false);
      setShiftToDelete(null);
    }
  };

  const columns: ColumnDef<Shift>[] = [
    {
      header: "Nombre del Turno",
      sortable: true,
      accessorKey: "name", // 🌟 ORDENABLE
      className: "font-medium text-slate-800 pl-6 w-[25%]",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="bg-blue-50/50 text-blue-600 p-2.5 rounded-xl border border-blue-100/50 shadow-sm">
            <Clock size={16} />
          </div>
          <span className="font-semibold text-slate-800">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Horarios por Día",
      className: "w-[25%]",
      cell: (row) => {
        // Agrupamos los días que tienen el MISMO horario para no repetir
        // Ej: Lunes a Viernes 08:00 - 14:00, Sábado 08:00 - 13:00
        const groupedSchedules: Record<string, string[]> = {};

        row.workDays.forEach((day) => {
          const blocks = row.blocksByDay?.[day];
          if (blocks && blocks.length > 0) {
            const timeString = blocks
              .map((b) => `${b.start} - ${b.end}`)
              .join(", ");
            if (!groupedSchedules[timeString])
              groupedSchedules[timeString] = [];
            groupedSchedules[timeString].push(day.substring(0, 3)); // Usamos Lun, Mar, Mie...
          }
        });

        const scheduleEntries = Object.entries(groupedSchedules);

        if (scheduleEntries.length === 0) {
          return (
            <span className="text-xs text-slate-400 italic">
              No configurado
            </span>
          );
        }

        return (
          <div className="flex flex-col gap-1.5">
            {scheduleEntries.map(([time, days], idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md min-w-12.5 text-center">
                  {days.length > 3
                    ? `${days[0]} a ${days[days.length - 1]}`
                    : days.join(", ")}
                </span>
                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                  {time}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: "Días Laborables",
      className: "w-[25%]", // Tampoco es ideal para ordernar numéricamente
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {WEEK_DAYS.map((day) => {
            const isActive = row.workDays.includes(day.id);
            return (
              <div
                key={day.id}
                title={day.id}
                className={`flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-normal transition-all duration-200 ${
                  isActive
                    ? "bg-blue-100/80 text-blue-700 border border-blue-200/60 shadow-sm"
                    : "bg-slate-50 text-slate-300 border border-slate-100/50"
                }`}
              >
                {day.label}
              </div>
            );
          })}
        </div>
      ),
    },
    {
      header: "Tolerancia",
      sortable: true,
      accessorKey: "toleranceMinutes", // 🌟 ORDENABLE
      className: "w-[15%]",
      cell: (row) => (
        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-200/70 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
          {row.toleranceMinutes} min
        </span>
      ),
    },
    {
      header: "",
      className: "pr-6 text-right w-[5%]",
      cell: (row) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: "Editar Turno",
            icon: <Edit2 size={16} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: "Eliminar",
            icon: <Trash2 size={16} />,
            variant: "danger",
            onClick: () => handleDelete(row.id),
          },
        ];
        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800">
      <AdminPageHeader
        title="Turnos y Horarios"
        description="Catálogo de horarios laborales para asignación de personal."
        actionLabel="Nuevo Turno"
        actionIcon={<Plus size={18} />}
        onAction={handleOpenCreateModal}
      />

      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        loadingText="Cargando catálogo de turnos..."
        emptyText="No hay turnos configurados. Crea uno para comenzar."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={shiftToEdit ? "Editar Turno" : "Crear Nuevo Turno"}
      >
        <ShiftForm
          initialData={shiftToEdit}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* 🌟 AQUÍ ESTÁ EL NUEVO MODAL DE CONFIRMACIÓN */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setShiftToDelete(null);
        }}
        onConfirm={executeDelete}
        isDanger
        title="Eliminar Turno"
        message="¿Estás seguro de eliminar este turno? Las maestras asignadas a él quedarán sin turno activo en la base de datos y esto afectará su registro de asistencia."
        confirmText="Sí, eliminar turno"
      />
    </div>
  );
}
