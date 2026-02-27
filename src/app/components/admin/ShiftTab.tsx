import { useState, useEffect } from "react";
import { ManageShifts } from "../../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../../infrastructure/repositories/FirebaseShiftRepository";
import type { Shift, TimeBlock } from "../../../domain/models/Shift";
import {
  Loader2,
  Clock,
  Plus,
  Trash2,
  UserCheck,
  ListTodo,
  Pencil,
  X,
} from "lucide-react";

const shiftRepo = new FirebaseShiftRepository();
const manageShiftsUseCase = new ManageShifts(shiftRepo);

export default function ShiftsTab() {
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Estados para CRUD de Turno
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState("");
  const [blocks, setBlocks] = useState<TimeBlock[]>([
    { start: "08:00", end: "14:00" },
  ]);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Estados para Asignar Turno
  const [assignUserId, setAssignUserId] = useState("");
  const [assignShiftId, setAssignShiftId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const loadShifts = async () => {
    try {
      const data = await manageShiftsUseCase.getCatalog();
      setShifts(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  // --- UX DEL FORMULARIO DE TURNOS ---

  const resetShiftForm = () => {
    setShiftName("");
    setBlocks([{ start: "08:00", end: "14:00" }]);
    setEditingShiftId(null);
  };

  const handleEditClick = (shift: Shift) => {
    setShiftName(shift.name);
    // Clonamos profundamente los bloques para evitar mutaciones accidentales
    setBlocks(JSON.parse(JSON.stringify(shift.blocks)));
    setEditingShiftId(shift.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (shiftId: string, shiftName: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el turno "${shiftName}"? Esto no eliminará las asignaciones previas, pero ya no se podrá asignar a nuevos maestros.`,
      )
    )
      return;

    setIsDeleting(shiftId);
    try {
      await manageShiftsUseCase.deleteShift(shiftId);
      if (editingShiftId === shiftId) resetShiftForm();
      await loadShifts();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el turno.");
    } finally {
      setIsDeleting(null);
    }
  };

  // --- MANEJO DE BLOQUES ---
  const handleAddBlock = () =>
    setBlocks([...blocks, { start: "15:00", end: "17:00" }]);
  const handleRemoveBlock = (index: number) =>
    setBlocks(blocks.filter((_, i) => i !== index));
  const handleBlockChange = (
    index: number,
    field: keyof TimeBlock,
    value: string,
  ) => {
    const newBlocks = [...blocks];
    newBlocks[index][field] = value;
    setBlocks(newBlocks);
  };

  // --- GUARDAR / ACTUALIZAR ---
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingShift(true);
    try {
      if (editingShiftId) {
        await manageShiftsUseCase.updateShift(
          editingShiftId,
          shiftName,
          blocks,
        );
      } else {
        await manageShiftsUseCase.createShift(shiftName, blocks);
      }
      resetShiftForm();
      await loadShifts();
    } catch (error: unknown) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    } finally {
      setIsSavingShift(false);
    }
  };

  // --- ASIGNAR ---
  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      await manageShiftsUseCase.assignToUser(
        assignUserId,
        assignShiftId,
        validFrom,
        validUntil || undefined,
      );
      alert("Turno asignado exitosamente.");
      setAssignUserId("");
      setAssignShiftId("");
      setValidFrom("");
      setValidUntil("");
    } catch (error: unknown) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 flex flex-col gap-6">
      {/* SECCIÓN SUPERIOR: FORMULARIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: CRUD DE TURNOS */}
        <div
          className={`p-6 rounded-lg border shadow-sm h-fit transition-colors ${editingShiftId ? "bg-blue-50/50 border-school-primary" : "bg-white border-slate-200"}`}
        >
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            {editingShiftId ? (
              <>
                <Pencil className="w-5 h-5 text-school-primary" /> Editar Turno
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-school-primary" /> Crear Nuevo
                Turno
              </>
            )}
          </h3>

          <form onSubmit={handleSaveShift} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre del Turno
              </label>
              <input
                type="text"
                required
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
                placeholder="Ej. Tallerista Mixto"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Bloques de Horario
                </label>
                <button
                  type="button"
                  onClick={handleAddBlock}
                  className="text-sm text-school-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar Bloque
                </button>
              </div>

              <div className="space-y-3">
                {blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm"
                  >
                    <span className="font-bold text-slate-400">#{idx + 1}</span>
                    <div className="flex-1">
                      <input
                        type="time"
                        required
                        value={block.start}
                        onChange={(e) =>
                          handleBlockChange(idx, "start", e.target.value)
                        }
                        className="w-full border border-slate-300 rounded p-1.5 outline-none focus:border-school-primary text-sm"
                      />
                    </div>
                    <span className="text-slate-500">a</span>
                    <div className="flex-1">
                      <input
                        type="time"
                        required
                        value={block.end}
                        onChange={(e) =>
                          handleBlockChange(idx, "end", e.target.value)
                        }
                        className="w-full border border-slate-300 rounded p-1.5 outline-none focus:border-school-primary text-sm"
                      />
                    </div>
                    {blocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingShiftId && (
                <button
                  type="button"
                  onClick={resetShiftForm}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2 rounded hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSavingShift}
                className={`flex-1 text-white font-medium py-2 rounded flex justify-center items-center transition-colors ${editingShiftId ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-800 hover:bg-slate-900"}`}
              >
                {isSavingShift ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : editingShiftId ? (
                  "Actualizar Turno"
                ) : (
                  "Guardar en Catálogo"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* PANEL 2: ASIGNAR TURNOS */}
        {/* ... (Tu panel de asignación se queda igual, copiado intacto) ... */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-school-primary" /> Asignar Turno
            a Trabajador
          </h3>

          {shifts.length === 0 ? (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded text-sm border border-yellow-200">
              Primero debes crear al menos un turno en el catálogo para
              asignarlo.
            </div>
          ) : (
            <form onSubmit={handleAssignShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  UID del Trabajador
                </label>
                <input
                  type="text"
                  required
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
                  placeholder="Pega el UID aquí..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Seleccionar Turno
                </label>
                <select
                  required
                  value={assignShiftId}
                  onChange={(e) => setAssignShiftId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
                >
                  <option value="">-- Elige un turno --</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Válido Desde
                  </label>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Válido Hasta (Opcional)
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAssigning}
                className="w-full bg-school-primary text-white font-medium py-2 rounded flex justify-center items-center hover:bg-blue-700 transition-colors mt-2"
              >
                {isAssigning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Vincular Horario"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* --- SECCIÓN INFERIOR: TABLA CRUD --- */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">
            Catálogo de Turnos Creados
          </h3>
        </div>
        {shifts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay turnos registrados. Crea uno en el panel superior.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <tr>
                <th className="p-4 font-semibold">Nombre del Turno</th>
                <th className="p-4 font-semibold">Bloques de Horario</th>
                <th className="p-4 font-semibold">Total de Registros</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className={`border-b border-slate-100 transition-colors ${editingShiftId === shift.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <td className="p-4 font-medium text-slate-800">
                    {shift.name}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {shift.blocks.map((b, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-mono font-medium"
                        >
                          {b.start} - {b.end}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {shift.blocks.length * 2} escaneos al día
                  </td>
                  <td className="p-4 text-right">
                    {/* BOTONES DE ACCIÓN (EDITAR / BORRAR) */}
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(shift)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                        title="Editar turno"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(shift.id, shift.name)}
                        disabled={isDeleting === shift.id}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50"
                        title="Eliminar turno"
                      >
                        {isDeleting === shift.id ? (
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
