import { useState, useEffect } from "react";
import {
  Loader2,
  Users,
  UserCheck,
  UserMinus,
  MoreHorizontal,
  Search,
  Download,
  TrendingUp,
} from "lucide-react";
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { ListenDailyAttendances } from "../../application/use-cases/ListenDailyAttendance";
import type { AttendanceWithWorker } from "../../domain/models/User";

const attendanceRepo = new FirebaseAttendanceRepository();
const listenAttendancesUseCase = new ListenDailyAttendances(attendanceRepo);

export default function AdminOverview() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [records, setRecords] = useState<AttendanceWithWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const loadAttendances = () => {
      setIsLoading(true);
      unsubscribe = listenAttendancesUseCase.execute(selectedDate, (data) => {
        setRecords(data);
        setIsLoading(false);
      });
    };
    loadAttendances();
    return () => {
      if (unsubscribe) unsubscribe();
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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER LIMPIO (Fuentes más ligeras) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
            Resumen Global
          </h1>
          <p className="text-slate-500 mt-1 font-normal">
            Monitoreo de asistencia y rendimiento en tiempo real.
          </p>
        </div>
      </div>

      {/* TARJETAS PREMIUM (Iconos con borde gradiente, sin fondo pesado) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mb-1">
                Personal Activo
              </p>
              <h3 className="text-4xl font-medium text-slate-700">124</h3>
            </div>
            {/* El truco del borde gradiente */}
            <div className="rounded-xl p-px bg-linear-to-br from-blue-400 to-indigo-500 shadow-sm transform ">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
              <TrendingUp className="w-3 h-3" /> +2%
            </span>
            <span className="text-slate-400 font-normal">vs. mes anterior</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mb-1">
                Asistencia Hoy
              </p>
              <h3 className="text-4xl font-medium text-slate-700">
                {records.length}
              </h3>
            </div>
            <div className="rounded-xl p-px bg-linear-to-br from-emerald-400 to-teal-500 shadow-sm transform ">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: "85%" }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            85% del personal esperado
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mb-1">
                Ausentismo
              </p>
              <h3 className="text-4xl font-medium text-slate-700">14</h3>
            </div>
            <div className="rounded-xl p-px bg-linear-to-br from-rose-400 to-orange-400 shadow-sm transform">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <UserMinus className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-xs font-medium">
            <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100/50">
              8 Faltas
            </span>
            <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100/50">
              6 Vacaciones
            </span>
          </div>
        </div>
      </div>

      {/* TABLA LIMPIA Y ESTÉTICA (Sin fondos grises que ensucien) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Actividad en Vivo
          </h3>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar empleado..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-light focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-full md:w-64"
              />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-light text-slate-600 outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              className="p-2 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />
              <p className="font-light text-sm">
                Sincronizando flujo de red...
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center p-20 text-slate-400 font-light text-sm">
              No hay registros para esta fecha.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-100 text-slate-400 text-xs font-medium uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6 font-medium">Empleado</th>
                  <th className="p-4 font-medium">Entrada</th>
                  <th className="p-4 font-medium">Salida</th>
                  <th className="p-4 text-center font-medium">Estado</th>
                  <th className="p-4 pr-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 text-sm">
                {records.map((record) => {
                  const hasLateCheckIn = record.periods.some((p) => p.isLate);

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-medium text-slate-500 text-xs">
                            {record.workerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {record.workerName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-light mt-0.5">
                              {record.userId.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="space-y-1.5">
                          {record.periods.map((p, i) => (
                            <div
                              key={`in-${i}`}
                              className="flex items-center gap-2"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
                              ></span>
                              <span className="font-mono text-xs text-slate-600">
                                {formatTime(p.checkIn)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="space-y-1.5">
                          {record.periods.map((p, i) => (
                            <div
                              key={`out-${i}`}
                              className="font-mono text-xs text-slate-500"
                            >
                              {p.checkOut ? (
                                formatTime(p.checkOut)
                              ) : (
                                <span className="text-slate-300 font-light italic">
                                  En turno
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-4 text-center align-middle">
                        {/* Status visualmente más suave, font-medium en vez de bold */}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium border ${hasLateCheckIn ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                        >
                          {hasLateCheckIn ? "Retardo" : "A Tiempo"}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right align-middle">
                        <button className="p-1.5 text-slate-300 hover:text-slate-600 rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
