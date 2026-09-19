import { Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import HistoryDayCard from "./HistoryDayCard";
import type { GroupedEmployeeRecord } from "../../pages/AdminOverview";
import type { AttendanceNote } from "../../../domain/models/AttendanceNote";

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: GroupedEmployeeRecord | null;
  /** Observations for this employee, keyed by YYYY-MM-DD. */
  notesByDate?: Record<string, AttendanceNote>;
  isLoadingNotes?: boolean;
  onSaveNote: (userId: string, date: string, text: string) => Promise<void>;
}

export default function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
  notesByDate = {},
  isLoadingNotes,
  onSaveNote,
}: EmployeeDetailModalProps) {
  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial: ${employee.workerName}`}
    >
      {isLoadingNotes && (
        <p className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Loader2 size={13} className="animate-spin" />
          Cargando observaciones...
        </p>
      )}

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {employee.dailyRecords.map((record) => (
          <HistoryDayCard
            key={record.date}
            record={record}
            note={notesByDate[record.date]}
            onSaveNote={(date, text) => onSaveNote(employee.userId, date, text)}
          />
        ))}
      </div>
    </Modal>
  );
}
