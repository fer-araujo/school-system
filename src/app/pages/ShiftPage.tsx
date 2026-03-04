import { useState, useEffect } from "react";
import { ManageShifts } from "../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import type { Shift } from "../../domain/models/Shift";
import { Plus, Edit2, Trash2, Clock, ArrowRight } from "lucide-react";
import DataTable, { type ColumnDef } from "../components/ui/DataTable";
import type { ActionMenuItem } from "../components/ui/ActionMenu";
import ActionMenu from "../components/ui/ActionMenu";
import Modal from "../components/ui/Modal";
import ShiftForm, { type ShiftFormData } from "../components/admin/ShiftForm";
import { WEEK_DAYS } from "../../domain/constants/schoolConfig";
import AdminPageHeader from "../components/ui/AdminPageHeader";

// Inicializamos el caso de uso
const shiftRepo = new FirebaseShiftRepository();
const manageShifts = new ManageShifts(shiftRepo);

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);

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
      if (shiftToEdit) {
        await manageShifts.updateShift(formData as Shift);
      } else {
        await manageShifts.createShift(formData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Hubo un error al guardar el turno: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de eliminar este turno? Las maestras asignadas a él quedarán sin turno en la base de datos.",
      )
    )
      return;
    try {
      await manageShifts.deleteShift(id);
      await loadData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Hubo un error al eliminar el turno: ${errorMessage}`);
    }
  };

  // Configuración de nuestro DataGrid reutilizable
  const columns: ColumnDef<Shift>[] = [
    {
      header: "Nombre del Turno",
      className: "font-medium text-slate-800 pl-6",
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
      header: "Bloques de Horario",
      cell: (row) => (
        <div className="flex flex-col gap-2">
          {row.blocks.map((block, index) => (
            // 1. EL NUEVO DISEÑO DE BLOQUE (Una sola pastilla suave con flecha)
            <div
              key={index}
              className="inline-flex items-center w-max gap-2.5 px-3 py-1.5 rounded-lg bg-indigo-50/70 text-indigo-700 border border-indigo-100/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <span className="font-mono text-xs font-normal tracking-wide">
                {block.start}
              </span>
              <ArrowRight
                size={14}
                className="text-indigo-400 opacity-70"
                strokeWidth={2.5}
              />
              <span className="font-mono text-xs font-normal tracking-wide">
                {block.end}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Días Laborables",
      cell: (row) => (
        // 2. EL NUEVO DISEÑO DE DÍAS (Calendario semanal fijo)
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
      cell: (row) => (
        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-200/70 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
          {row.toleranceMinutes} min
        </span>
      ),
    },
    {
      header: "",
      className: "pr-6 text-right w-16",
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
      {/* HEADER */}
      <AdminPageHeader
        title="Turnos y Horarios"
        description="Catálogo de horarios laborales para asignación de personal."
        actionLabel="Nuevo Turno"
        actionIcon={<Plus size={18} />}
        onAction={handleOpenCreateModal}
      />

      {/* DATAGRID REUTILIZABLE */}
      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        loadingText="Cargando catálogo de turnos..."
        emptyText="No hay turnos configurados. Crea uno para comenzar."
      />

      {/* MODAL REUTILIZABLE */}
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
    </div>
  );
}
