import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  Download,
  ArrowRight,
} from "lucide-react";

// --- REPOSITORIOS ---
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { FirebaseAbsenceRepository } from "../../infrastructure/repositories/FirebaseAbsenceRepository";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";

// --- CASOS DE USO ---
import { ListenDailyAttendances } from "../../application/use-cases/ListenDailyAttendance";
import {
  GetDashboardStats,
  type DashboardTableRecord,
} from "../../application/use-cases/GetDashboardStats";
import { ManageEmployees } from "../../application/use-cases/ManageEmployees";

import type { ColumnDef } from "../components/ui/DataTable";
import { getAvatarColor } from "../../utils/helpers";
import DataTable from "../components/ui/DataTable";
import AdminPageHeader from "../components/ui/AdminPageHeader";
import type { WorkPeriod } from "../../domain/models/User";

const attendanceRepo = new FirebaseAttendanceRepository();
const listenAttendancesUseCase = new ListenDailyAttendances(attendanceRepo);

const manageEmployees = new ManageEmployees();
const absenceRepo = new FirebaseAbsenceRepository();
const shiftRepo = new FirebaseShiftRepository();
const getDashboardStatsUseCase = new GetDashboardStats(
  manageEmployees,
  absenceRepo,
  shiftRepo,
);

export default function AdminOverview() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [records, setRecords] = useState<DashboardTableRecord[]>([]);
  const [tableData, setTableData] = useState<DashboardTableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    expectedToday: 0,
    totalAbsences: 0,
    faltasInjustificadas: 0,
    isPollingNeeded: false,
  });

  useEffect(() => {
    const unsubscribe = listenAttendancesUseCase.execute(
      selectedDate,
      (data) => {
        setRecords(data as DashboardTableRecord[]);
        setIsLoading(false);
      },
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const fetchStats = async () => {
      const result = await getDashboardStatsUseCase.execute(
        selectedDate,
        records,
      );
      setStats(result);
      if (result.fullTableData) {
        setTableData(result.fullTableData);
      } else {
        setTableData(records);
      }
      if (!result.isPollingNeeded && intervalId) {
        clearInterval(intervalId);
      }
    };

    fetchStats();

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (selectedDate === todayStr) {
      intervalId = setInterval(() => {
        fetchStats();
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedDate, records]);

  const formatTime = (dateValue?: Date) => {
    if (!dateValue) return "--:--";
    return dateValue.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalTime = (periods: WorkPeriod[]) => {
    let totalMs = 0;
    const now = new Date();

    periods.forEach((p) => {
      if (p.isAbsent || !p.checkIn) return;
      const end = p.checkOut ? p.checkOut.getTime() : now.getTime();
      totalMs += end - p.checkIn.getTime();
    });

    if (totalMs === 0) return "0h 0m";

    const totalMins = Math.floor(totalMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  };

  const columns: ColumnDef<DashboardTableRecord>[] = [
    {
      header: "EMPLEADO",
      className: "pl-6 w-[25%]",
      cell: (row) => {
        const colorClass = getAvatarColor(row.workerName);
        return (
          <div className="flex items-center gap-3 py-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${colorClass}`}
            >
              {row.workerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-slate-800 text-[13px]">
                {row.workerName}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {row.employeeNumber}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "DEPARTAMENTO",
      className: "w-[12%]",
      cell: (row) => (
        // CAMBIO: Indigo en lugar de Slate para contrastar con el Zebra
        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100/60">
          {row.department || "Docencia"}
        </span>
      ),
    },
    {
      header: "REGISTROS (ENTRADA ➔ SALIDA)",
      className: "w-[26%]",
      cell: (row) => (
        <div className="flex flex-col gap-1.5 py-1">
          {row.periods.map((p: WorkPeriod, i) => {
            const isMissing = p.isAbsent || !p.checkIn;

            return (
              // ADIÓS bg-white, border y shadow. Dejamos el contenedor limpio y transparente.
              <div
                key={i}
                className="flex items-center text-[12px] font-medium px-2 py-1 w-fit"
              >
                {isMissing ? (
                  <div className="flex items-center justify-center w-37.5">
                    {row.isJustified ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 shrink-0"></span>
                        <span className="font-medium text-amber-500 tracking-wider uppercase text-[11px]">
                          Permiso
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shrink-0"></span>
                        <span className="font-medium text-rose-500 tracking-wider uppercase text-[11px]">
                          Falta
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
                    ></span>
                    <span className="w-14 text-slate-700">
                      {formatTime(p.checkIn)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <span
                      className={`w-16 ${p.checkOut ? "text-slate-600" : "text-blue-600"}`}
                    >
                      {p.checkOut ? formatTime(p.checkOut) : "En turno"}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ),
    },
    {
      header: "TIEMPO TOTAL",
      className: "w-[15%]",
      cell: (row) => {
        const hasAbsenceOnly = row.periods.every(
          (p: WorkPeriod) => p.isAbsent || !p.checkIn,
        );
        if (hasAbsenceOnly) {
          // CAMBIO: Usamos text-zinc-400 como pediste, con un toque de opacidad
          return (
            <span className="text-zinc-400/80 text-[12px] font-bold tracking-widest">
              --:--
            </span>
          );
        }
        return (
          <span className="text-slate-600 text-[12px] font-medium">
            {calculateTotalTime(row.periods)}
          </span>
        );
      },
    },
    {
      header: "ESTADO GENERAL",
      className: "w-[22%]",
      cell: (row) => {
        if (row.isJustified) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-normal bg-amber-50 text-amber-600 border border-amber-200">
              Permiso: {row.absenceReason}
            </span>
          );
        }

        const allAbsent =
          row.periods.length > 0 &&
          row.periods.every((p: WorkPeriod) => p.isAbsent || !p.checkIn);
        const someAbsent = row.periods.some(
          (p: WorkPeriod) => p.isAbsent || !p.checkIn,
        );
        const hasLate = row.periods.some((p: WorkPeriod) => p.isLate);

        if (allAbsent) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-normal bg-rose-50 text-rose-600 border border-rose-100">
              Falta
            </span>
          );
        }
        if (someAbsent) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-normal bg-rose-50 text-rose-600 border border-rose-100">
              Falta Parcial
            </span>
          );
        }
        if (hasLate) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-normal bg-orange-50 text-orange-600 border border-orange-200">
              Retardo
            </span>
          );
        }

        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-normal bg-emerald-50 text-emerald-600 border border-emerald-100">
            A Tiempo
          </span>
        );
      },
    },
  ];

  const attendancePercentage =
    stats.expectedToday > 0 ? (records.length / stats.expectedToday) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Resumen Global"
        description="Monitoreo de asistencia y rendimiento en tiempo real."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* TARJETA 1 */}
        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Personal Activo
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {stats.totalEmployees}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl border border-blue-100 bg-white text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="inline-block px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-[11px] font-medium">
              Plantilla Completa
            </span>
          </div>
        </div>

        {/* TARJETA 2 */}
        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Asistencias
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {records.length}{" "}
                <span className="text-xl text-slate-400 font-normal">
                  / {stats.expectedToday}
                </span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl border border-emerald-100 bg-white text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-auto w-full">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${attendancePercentage}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Personal esperado hoy
            </p>
          </div>
        </div>

        {/* TARJETA 3 */}
        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Permisos
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {stats.totalAbsences}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-200 bg-white text-amber-500">
              <UserMinus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="inline-block px-2.5 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100/50 text-[11px] font-medium">
              Incapacidades / Vacaciones
            </span>
          </div>
        </div>

        {/* TARJETA 4 */}
        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Faltas Injust.
              </p>
              <h3 className="text-4xl font-semibold text-rose-600 tracking-tight">
                {stats.faltasInjustificadas}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl border border-rose-200 bg-white text-rose-500">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="inline-block px-2.5 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100/50 text-[11px] font-medium">
              Turnos pasados sin asistir
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Actividad en Vivo
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setIsLoading(true);
                setSelectedDate(e.target.value);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-300 transition-colors cursor-pointer"
            />
            <button
              onClick={() => console.log("Descargar CSV")}
              className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
              title="Exportar CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tableData}
          isLoading={isLoading}
          loadingText="Sincronizando flujo de red..."
          emptyText="No hay registros de asistencia para esta fecha."
        />
      </div>
    </div>
  );
}
