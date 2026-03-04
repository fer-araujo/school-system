import { useState, useEffect } from "react";
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

const manageAbsences = new ManageAbsences();
const manageEmployees = new ManageEmployees();

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [absenceToEdit, setAbsenceToEdit] = useState<Absence | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [absData, empData] = await Promise.all([
        manageAbsences.getAllAbsences(),
        manageEmployees.getAllWorkers(), // Usamos lo que ya teníamos
      ]);
      setAbsences(absData);
      setEmployees(empData);
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
        // MODO EDICIÓN: Armamos el objeto perfecto
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
      } else {
        // MODO CREACIÓN: Armamos explícitamente el objeto sin extraer el ID para que el linter no llore
        await manageAbsences.createAbsence({
          userId: formData.userId,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      // AQUÍ USAMOS EL ERROR: Lo imprimimos para debug técnico
      console.error("Error al guardar permiso:", error);
      alert("Hubo un error al guardar el permiso.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await manageAbsences.deleteAbsence(id);
      await loadData();
    } catch (error) {
      // AQUÍ TAMBIÉN USAMOS EL ERROR
      console.error("Error al eliminar permiso:", error);
      alert("Error al eliminar el permiso.");
    }
  };

  const columns: ColumnDef<Absence>[] = [
    {
      header: "Empleado",
      className: "pl-6",
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
            onClick: () => handleDelete(row.id),
          },
        ];
        return <ActionMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-800">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
            Permisos y Ausencias
          </h1>
          <p className="text-slate-500 mt-1 font-normal">
            Gestión de faltas, vacaciones y justificantes médicos.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-fit"
        >
          <Plus size={18} /> Registrar Ausencia
        </button>
      </div>

      <DataTable
        columns={columns}
        data={absences}
        isLoading={isLoading}
        loadingText="Cargando historial..."
        emptyText="No hay registros de ausencias."
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
    </div>
  );
}
