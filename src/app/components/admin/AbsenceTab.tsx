import { useState } from "react";
import { FirebaseAbsenceRepository } from "../../../infrastructure/repositories/FirebaseAbsenceRepository";
import type { AbsenceType } from "../../../domain/models/Absence";
import { Loader2 } from "lucide-react";
import { ManageAbsences } from "../../../application/use-cases/ManageAbsence";

const absenceRepo = new FirebaseAbsenceRepository();
const manageAbsencesUseCase = new ManageAbsences(absenceRepo);

export default function AbsencesTab() {
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<AbsenceType>("VACATION");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await manageAbsencesUseCase.assignAbsenceRange(
        userId,
        startDate,
        endDate,
        type,
        notes,
      );
      alert("Ausencia registrada correctamente.");
      setUserId("");
      setStartDate("");
      setEndDate("");
      setNotes("");
    } catch (error: unknown) {
      if (error instanceof Error) alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-2xl">
        <h3 className="font-semibold text-slate-800 mb-4">
          Registrar Ausencia Justificada
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              UID del Trabajador
            </label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AbsenceType)}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary bg-white"
            >
              <option value="VACATION">Vacaciones</option>
              <option value="SICK_LEAVE">Incapacidad Médica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notas
            </label>
            <textarea
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-school-primary text-white font-medium py-2 rounded flex justify-center items-center hover:bg-blue-700 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Bloquear Días"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
