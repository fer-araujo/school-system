import { useState, useEffect, type SetStateAction } from "react";
import { FirebaseAttendanceRepository } from "../../../infrastructure/repositories/FirebaseAttendanceRepository";
import type { AttendanceWithWorker } from "../../../domain/models/User";
import {
  Loader2,
  Users,
  UserCheck,
  UserMinus,
  MoreHorizontal,
  Search,
  Download,
} from "lucide-react";
import { ListenDailyAttendances } from "../../../application/use-cases/ListenDailyAttendance";

const attendanceRepo = new FirebaseAttendanceRepository();
const listenAttendancesUseCase = new ListenDailyAttendances(attendanceRepo);

export default function AttendanceTab() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [records, setRecords] = useState<AttendanceWithWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- LÓGICA DE TIEMPO REAL (La forma estricta y correcta) ---
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadAttendances = () => {
      setIsLoading(true);
      setRecords([]);
      unsubscribe = listenAttendancesUseCase.execute(
        selectedDate,
        (data: SetStateAction<AttendanceWithWorker[]>) => {
          setRecords(data);
          setIsLoading(false);
        },
      );
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
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* --- LAS 3 TARJETAS DE PODER (Estilo SaaS Premium) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta 1: Total */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Personal Total
              </p>
              <h3 className="text-4xl font-extrabold text-slate-800 mt-1">
                124
              </h3>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
              120 Activos
            </span>
            <span className="bg-yellow-50 text-yellow-600 px-2 py-1 rounded-md">
              4 Incapacidad
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Check-ins (Verde) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Asistencia Hoy
              </p>
              <h3 className="text-4xl font-extrabold text-slate-800 mt-1">
                {records.length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
              98 Puntuales
            </span>
            <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md">
              12 Retardos
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Ausentismo (Rojo) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">
                Ausentismo
              </p>
              <h3 className="text-4xl font-extrabold text-slate-800 mt-1">
                14
              </h3>
            </div>
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <UserMinus className="w-6 h-6" />
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md">
              Faltas Injustificadas
            </span>
          </div>
        </div>
      </div>

      {/* --- LA TABLA EN TIEMPO REAL --- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Cabecera de la Tabla */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <h3 className="text-xl font-bold text-slate-800">
            Actividad de Check-ins en Vivo
          </h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar empleado..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-school-primary focus:border-school-primary outline-none transition-all w-full md:w-64"
              />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:ring-2 focus:ring-school-primary"
            />
            <button
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              title="Exportar"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo de la Tabla */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-school-primary" />
              <p>Sincronizando registros en vivo...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center p-12 text-slate-500 font-medium bg-slate-50/50">
              No hay registros de asistencia para esta fecha.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4 md:px-6">Nombre del Empleado</th>
                  <th className="p-4 md:px-6">Entradas Registradas</th>
                  <th className="p-4 md:px-6">Salidas Registradas</th>
                  <th className="p-4 md:px-6 text-center">Estado</th>
                  <th className="p-4 md:px-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((record) => {
                  // Determinamos el estado visual basado en si tuvo ALGÚN retardo
                  const hasLateCheckIn = record.periods.some((p) => p.isLate);

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Columna Empleado */}
                      <td className="p-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {record.workerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">
                              {record.workerName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              UID: {record.userId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Columna Entradas */}
                      <td className="p-4 md:px-6 align-top">
                        <div className="space-y-1.5">
                          {record.periods.map((p, i) => (
                            <div
                              key={`in-${i}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${p.isLate ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full current-color bg-current opacity-70"></span>
                              {formatTime(p.checkIn)}{" "}
                              {p.isLate && (
                                <span className="text-[10px] ml-1 uppercase">
                                  Retardo
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Columna Salidas */}
                      <td className="p-4 md:px-6 align-top">
                        <div className="space-y-1.5">
                          {record.periods.map((p, i) => (
                            <div key={`out-${i}`}>
                              {p.checkOut ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {formatTime(p.checkOut)}
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 italic">
                                  --:--
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Columna Estado */}
                      <td className="p-4 md:px-6 text-center align-middle">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${hasLateCheckIn ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {hasLateCheckIn ? "Llegada Tarde" : "Puntual"}
                        </span>
                      </td>

                      {/* Botón Acciones */}
                      <td className="p-4 md:px-6 text-right align-middle">
                        <button className="p-2 text-slate-300 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
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
