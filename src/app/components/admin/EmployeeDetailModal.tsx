import Modal from "../ui/Modal";
import { ArrowRight } from "lucide-react";
import { formatTime } from "../../../utils/helpers";
import type { GroupedEmployeeRecord } from "../../pages/AdminOverview";
import type { WorkPeriod } from "../../../domain/models/User";

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: GroupedEmployeeRecord | null;
}

export default function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
}: EmployeeDetailModalProps) {
  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial: ${employee.workerName}`}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {employee.dailyRecords.map((record, index) => {
          const isMissingTotal =
            record.periods.length > 0 &&
            record.periods.every((p) => p.isAbsent || !p.checkIn);
          const dateObj = new Date(record.date + "T12:00:00");

          return (
            <div
              key={index}
              className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-sm font-bold text-slate-700 capitalize">
                  {dateObj.toLocaleDateString("es-MX", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
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
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {record.periods.map((p: WorkPeriod, i) => {
                  const isMissing = p.isAbsent || !p.checkIn;
                  if (isMissing) return null; // El badge de falta ya está arriba

                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
                      ></span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium w-16 text-center  py-1 rounded ">
                          {formatTime(p.checkIn)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span
                          className={`font-medium w-16 text-center py-1 rounded  ${p.checkOut ? "text-slate-700" : "text-blue-700 "}`}
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
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
