import { useState, useEffect } from "react";
import { Users, UserCheck, UserMinus, Download } from "lucide-react";
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { ListenDailyAttendances } from "../../application/use-cases/ListenDailyAttendance";
import type { AttendanceWithWorker } from "../../domain/models/User";
import type { ColumnDef } from "../components/ui/DataTable";
import { getAvatarColor } from "../../utils/helpers";
import DataTable from "../components/ui/DataTable";


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

  // CONFIGURACIÓN DE COLUMNAS PARA DATATABLE
  const columns: ColumnDef<AttendanceWithWorker>[] = [
    {
      header: "Empleado",
      className: "pl-6",
      cell: (row) => {
        const colorClass = getAvatarColor(row.workerName);
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shadow-sm ${colorClass}`}
            >
              {row.workerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-slate-800">{row.workerName}</div>
              <div className="text-[11px] text-slate-400 font-light">
                {row.userId.substring(0, 8)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Entradas",
      cell: (row) => (
        <div className="space-y-1.5">
          {row.periods.map((p, i) => (
            <div key={`in-${i}`} className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
              ></span>
              <span className="font-mono text-xs text-slate-600 font-medium">
                {formatTime(p.checkIn)}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Salidas",
      cell: (row) => (
        <div className="space-y-1.5">
          {row.periods.map((p, i) => (
            <div key={`out-${i}`} className="font-mono text-xs text-slate-500">
              {p.checkOut ? (
                formatTime(p.checkOut)
              ) : (
                <span className="text-slate-300 font-light italic bg-slate-50 px-2 py-0.5 rounded">
                  En turno
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Estado General",
      cell: (row) => {
        const hasLateCheckIn = row.periods.some((p) => p.isLate);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold border ${hasLateCheckIn ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
          >
            {hasLateCheckIn ? "Retardo" : "A Tiempo"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER LIMPIO */}
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

      {/* TARJETAS PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mb-1">
                Personal Activo
              </p>
              <h3 className="text-4xl font-medium text-slate-700">30</h3>
            </div>
            <div className="rounded-xl p-px bg-linear-to-br from-blue-400 to-indigo-500 shadow-sm">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">
              Plantilla Completa
            </span>
          </div>
        </div>

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
            <div className="rounded-xl p-px bg-linear-to-br from-emerald-400 to-teal-500 shadow-sm">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${(records.length / 30) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Del personal esperado
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mb-1">
                Ausencias / Permisos
              </p>
              <h3 className="text-4xl font-medium text-slate-700">--</h3>
            </div>
            <div className="rounded-xl p-px bg-linear-to-br from-rose-400 to-orange-400 shadow-sm">
              <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center">
                <UserMinus className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-xs font-medium">
            <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
              Cálculo en proceso...
            </span>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE LA DATATABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Barra de herramientas superior */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Actividad en Vivo
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            <button
              className="p-2 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabla renderizada a través de nuestro componente UI */}
        <DataTable
          columns={columns}
          data={records}
          isLoading={isLoading}
          loadingText="Sincronizando flujo de red..."
          emptyText="No hay registros de asistencia para esta fecha."
        />
      </div>
    </div>
  );
}
