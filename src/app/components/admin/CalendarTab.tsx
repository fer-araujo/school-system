import { useState, useEffect } from "react";
import { ManageHolidays } from "../../../application/use-cases/ManageHolidays";
import { FirebaseCalendarRepository } from "../../../infrastructure/repositories/FirebaseCalendarRepository";
import type { Holiday, HolidayType } from "../../../domain/models/Calendar";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

const calendarRepo = new FirebaseCalendarRepository();
const manageHolidaysUseCase = new ManageHolidays(calendarRepo);

export default function CalendarTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Estados del formulario
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<HolidayType>("OFFICIAL");

  // Estados de control de UX
  const [isSaving, setIsSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null); // null = Modo Crear, string = Modo Editar
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadHolidays = async () => {
    try {
      const data = await manageHolidaysUseCase.getUpcoming();
      setHolidays(data);
    } catch (error) {
      console.error("Error cargando calendario:", error);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  // --- ACCIONES DE UX ---

  const resetForm = () => {
    setDate("");
    setReason("");
    setType("OFFICIAL");
    setEditingDate(null);
  };

  const handleEditClick = (hol: Holiday) => {
    setDate(hol.date);
    setReason(hol.reason);
    setType(hol.type);
    setEditingDate(hol.date);
    // Hacemos scroll suave hacia arriba por si la tabla es muy larga
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (dateToDelete: string) => {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar el asueto del ${dateToDelete}?`,
      )
    )
      return;

    setIsDeleting(dateToDelete);
    try {
      await manageHolidaysUseCase.delete(dateToDelete);
      if (editingDate === dateToDelete) resetForm(); // Si estaba editando el que borró, limpiamos
      await loadHolidays();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el asueto");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Magia de UX: Si está editando y cambió la fecha, borramos el registro viejo para no duplicar
      if (editingDate && editingDate !== date) {
        await manageHolidaysUseCase.delete(editingDate);
      }

      await manageHolidaysUseCase.save(date, reason, type);
      resetForm();
      await loadHolidays();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el asueto");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* --- FORMULARIO INTELIGENTE --- */}
      <div
        className={`md:col-span-1 p-6 rounded-lg border shadow-sm h-fit transition-colors ${editingDate ? "bg-blue-50/50 border-school-primary" : "bg-white border-slate-200"}`}
      >
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          {editingDate ? (
            <>
              <Pencil className="w-5 h-5 text-school-primary" /> Editar Asueto
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-school-primary" /> Nuevo Asueto
            </>
          )}
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de Día
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HolidayType)}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
            >
              <option value="OFFICIAL">Oficial (Ley)</option>
              <option value="SEP">SEP (Consejo Técnico)</option>
              <option value="CUSTOM">Interno (Escuela)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
              placeholder="Ej. Día del maestro"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {editingDate && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2 rounded hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 text-white font-medium py-2 rounded flex justify-center items-center transition-colors ${editingDate ? "bg-blue-600 hover:bg-blue-700" : "bg-school-primary hover:bg-blue-800"}`}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : editingDate ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* --- TABLA INTERACTIVA --- */}
      <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-fit">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">
            Próximos Días Inhábiles
          </h3>
        </div>
        {holidays.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay asuetos programados.
          </div>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {holidays.map((hol, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 transition-colors ${editingDate === hol.date ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <td className="p-4 font-mono text-sm text-slate-600 font-medium w-32">
                    {hol.date}
                  </td>
                  <td className="p-4 text-slate-800">{hol.reason}</td>
                  <td className="p-4 text-right">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded mr-4">
                      {hol.type}
                    </span>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(hol)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                        title="Editar asueto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(hol.date)}
                        disabled={isDeleting === hol.date}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50"
                        title="Eliminar asueto"
                      >
                        {isDeleting === hol.date ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
