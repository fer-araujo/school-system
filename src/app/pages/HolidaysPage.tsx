import { useState, useEffect } from "react";
import { ManageHolidays } from "../../application/use-cases/ManageHolidays";
import type { Holiday } from "../../domain/models/Holiday";
import { Edit2, Trash2, CalendarDays, Flag, School } from "lucide-react";
import type { HolidayFormData } from "../components/admin/HolidayForm";
import type { ColumnDef } from "../components/ui/DataTable";
import ActionMenu, { type ActionMenuItem } from "../components/ui/ActionMenu";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import HolidayForm from "../components/admin/HolidayForm";
import AdminPageHeader from "../components/ui/AdminPageHeader";

const manageHolidays = new ManageHolidays();

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<Holiday | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await manageHolidays.getHolidays();
      setHolidays(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSubmit = async (formData: HolidayFormData) => {
    try {
      if (holidayToEdit && formData.id) {
        // MODO EDICIÓN
        await manageHolidays.updateHoliday(formData as Holiday);
      } else {
        // MODO CREACIÓN: Armamos el objeto explícitamente sin extraer el ID
        await manageHolidays.createHoliday({
          name: formData.name,
          date: formData.date,
          type: formData.type,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error al guardar festivo:", error);
      alert("Hubo un error al guardar el día festivo.");
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta fecha del calendario?"))
      return;
    try {
      await manageHolidays.deleteHoliday(id);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar la fecha.");
    }
  };

  const columns: ColumnDef<Holiday>[] = [
    {
      header: "Fecha",
      className: "pl-6",
      cell: (row) => (
        <span className="font-medium text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/50">
          {row.date}
        </span>
      ),
    },
    {
      header: "Motivo del Asueto",
      cell: (row) => (
        <span className="font-semibold text-slate-700">{row.name}</span>
      ),
    },
    {
      header: "Tipo",
      cell: (row) => {
        const isOfficial = row.type === "Oficial (Ley)";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${isOfficial ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}
          >
            {isOfficial ? <Flag size={12} /> : <School size={12} />}
            {row.type}
          </span>
        );
      },
    },
    {
      header: "",
      className: "pr-6 text-right w-16",
      cell: (row) => {
        const menuItems: ActionMenuItem[] = [
          {
            label: "Editar",
            icon: <Edit2 size={16} />,
            onClick: () => {
              setHolidayToEdit(row);
              setIsModalOpen(true);
            },
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
        title="Calendario Escolar"
        description="Días de asueto oficial y cierres internos de la escuela."
        actionLabel="Agregar Fecha"
        actionIcon={<CalendarDays size={18} />}
        onAction={() => {
          setHolidayToEdit(null);
          setIsModalOpen(true);
        }}
      />

      <DataTable
        columns={columns}
        data={holidays}
        isLoading={isLoading}
        loadingText="Cargando calendario..."
        emptyText="No hay días festivos configurados."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={holidayToEdit ? "Editar Fecha" : "Nuevo Día Festivo"}
      >
        <HolidayForm
          initialData={holidayToEdit}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
