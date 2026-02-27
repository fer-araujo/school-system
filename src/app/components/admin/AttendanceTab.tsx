import { useState, useEffect } from "react";
import { FirebaseAttendanceRepository } from "../../../infrastructure/repositories/FirebaseAttendanceRepository";
import type { AttendanceWithWorker } from "../../../domain/models/User";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { GetDailyAttendances } from "../../../application/use-cases/GetDailyAttendance";

const attendanceRepo = new FirebaseAttendanceRepository();
const getAttendancesUseCase = new GetDailyAttendances(attendanceRepo);

export default function AttendanceTab() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [records, setRecords] = useState<AttendanceWithWorker[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadAttendances = async () => {
      setIsLoading(true);
      try {
        const data = await getAttendancesUseCase.execute(selectedDate);
        if (isMounted) setRecords(data);
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAttendances();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const formatTime = (dateValue?: Date) => {
    if (!dateValue) return "--:--";
    return dateValue.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-700">
          Asistencias del Día
        </h2>
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded p-2 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none text-slate-700 font-medium"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-school-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-slate-500">
            No hay registros para esta fecha.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <tr>
                <th className="p-4 font-semibold">Trabajador</th>
                <th className="p-4 font-semibold text-center">Entrada</th>
                <th className="p-4 font-semibold text-center">Salida</th>
                <th className="p-4 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-4 font-medium text-slate-800">
                    {record.workerName}
                  </td>
                  <td className="p-4 text-center font-mono text-sm">
                    {record.periods.map((p, i) => (
                      <div
                        key={i}
                        className={`mb-1 px-2 py-0.5 rounded inline-block w-full ${p.isLate ? "text-red-700 bg-red-100 border border-red-200 font-bold" : "text-green-700 bg-green-50/50"}`}
                        title={
                          p.isLate
                            ? "Llegó tarde a su bloque de turno"
                            : "Entrada a tiempo"
                        }
                      >
                        {formatTime(p.checkIn)} {p.isLate && "⚠️"}
                      </div>
                    ))}
                  </td>
                  <td className="p-4 text-center font-mono text-sm">
                    {record.periods.map((p, i) => (
                      <div
                        key={i}
                        className="mb-1 text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded inline-block w-full"
                      >
                        {p.checkOut ? (
                          formatTime(p.checkOut)
                        ) : (
                          <span className="text-slate-400">En turno</span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="p-4 text-center">
                    {record.status === "COMPLETED" ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 text-xs font-bold rounded-full">
                        Turno Completo
                      </span>
                    ) : record.status === "PRESENT" ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-full">
                        En Plantel
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold rounded-full">
                        {record.status}
                      </span>
                    )}
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
