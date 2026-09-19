import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  MessageSquarePlus,
  MessageSquareText,
  Pencil,
} from "lucide-react";
import { formatTime } from "../../../utils/helpers";
import { MAX_NOTE_LENGTH } from "../../../domain/constants/attendanceRules";
import type { AttendanceNote } from "../../../domain/models/AttendanceNote";
import type { WorkPeriod } from "../../../domain/models/User";
import type { DashboardTableRecord } from "../../../application/use-cases/GetDashboardStats";

interface HistoryDayCardProps {
  record: DashboardTableRecord;
  note?: AttendanceNote;
  onSaveNote: (date: string, text: string) => Promise<void>;
}

export default function HistoryDayCard({
  record,
  note,
  onSaveNote,
}: HistoryDayCardProps) {
  const noteText = note?.text ?? "";
  const hasNote = noteText.length > 0;
  const hasLeaveNotes = Boolean(record.absenceNotes);
  // A card only becomes an accordion when it actually has something to reveal.
  const isExpandable = hasNote || hasLeaveNotes;

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(noteText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isMissingTotal =
    record.periods.length > 0 &&
    record.periods.every((p) => p.isAbsent || !p.checkIn);
  const dateObj = new Date(record.date + "T12:00:00");

  const startEditing = () => {
    setDraft(noteText);
    setError("");
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await onSaveNote(record.date, draft);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la observación.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
        <span className="text-sm font-bold text-slate-700 capitalize">
          {dateObj.toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {record.isJustified ? (
            <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">
              Permiso
            </span>
          ) : isMissingTotal ? (
            <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded">
              Falta
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
              Asistió
            </span>
          )}

          {isExpandable && (
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              title={isOpen ? "Ocultar detalle" : "Ver detalle"}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <MessageSquareText size={14} />
              <ChevronDown
                size={14}
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {record.isJustified && record.absenceReason && (
          <p className="text-sm text-slate-600">
            <span className="text-slate-400">Motivo:</span>{" "}
            <span className="font-medium text-amber-700">
              {record.absenceReason}
            </span>
          </p>
        )}

        {record.periods.map((p: WorkPeriod, i) => {
          const isMissing = p.isAbsent || !p.checkIn;
          if (isMissing) return null; // El badge de falta ya está arriba

          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
              ></span>
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-medium w-16 text-center py-1 rounded">
                  {formatTime(p.checkIn)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span
                  className={`font-medium w-16 text-center py-1 rounded ${p.checkOut ? "text-slate-700" : "text-blue-700"}`}
                >
                  {p.checkOut ? formatTime(p.checkOut) : "---"}
                </span>
              </div>
              {p.isLate && (
                <span className="text-[10px] text-orange-500 font-bold ml-2">
                  Retardo
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/70">
          {hasLeaveNotes && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Nota del permiso
              </p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {record.absenceNotes}
              </p>
            </div>
          )}

          {hasNote && !isEditing && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Observación
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {noteText}
              </p>
              {(note?.authorName || note?.updatedAt) && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {note?.authorName ? `${note.authorName} · ` : ""}
                  {note?.updatedAt?.toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/70">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            placeholder="Ej: Avisó que llegaría tarde por cita médica."
            className="w-full text-sm rounded-lg border border-slate-200 p-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              {hasNote
                ? "Vacía la caja para eliminar la observación."
                : `${draft.length}/${MAX_NOTE_LENGTH}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                }}
                disabled={isSaving}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 cursor-pointer disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="self-start inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {hasNote ? <Pencil size={13} /> : <MessageSquarePlus size={14} />}
          {hasNote ? "Editar observación" : "Agregar observación"}
        </button>
      )}
    </div>
  );
}
