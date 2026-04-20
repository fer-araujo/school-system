import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  ArrowRight,
  Calendar as CalendarIcon,
  Eye,
} from "lucide-react";

// --- REPOSITORIOS Y CASOS DE USO ---
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { FirebaseAbsenceRepository } from "../../infrastructure/repositories/FirebaseAbsenceRepository";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import { FirebaseCalendarRepository } from "../../infrastructure/repositories/FirebaseCalendarRepository";
import { FirebaseEmployeeRepository } from "../../infrastructure/repositories/FirebaseEmployeeRepository";
import { ListenDailyAttendances } from "../../application/use-cases/ListenDailyAttendance";
import {
  GetDashboardStats,
  type DashboardTableRecord,
} from "../../application/use-cases/GetDashboardStats";
import { ManageEmployees } from "../../application/use-cases/ManageEmployees";

import type { ColumnDef } from "../components/ui/DataTable";
import { formatTime, getAvatarColor } from "../../utils/helpers";
import DataTable from "../components/ui/DataTable";
import AdminPageHeader from "../components/ui/AdminPageHeader";
import type { WorkPeriod } from "../../domain/models/User";
import { exportAdminOverviewToCSV } from "../../utils/CSVfunctions";

// 🌟 NUEVOS COMPONENTES EXTRAÍDOS
import ShiftFilterPills from "../components/ui/ShiftFilterPills";
import EmployeeDetailModal from "../components/admin/EmployeeDetailModal";

const employeeRepo = new FirebaseEmployeeRepository();
const attendanceRepo = new FirebaseAttendanceRepository();
const listenAttendancesUseCase = new ListenDailyAttendances(attendanceRepo);
const calendarRepo = new FirebaseCalendarRepository();
const absenceRepo = new FirebaseAbsenceRepository();
const shiftRepo = new FirebaseShiftRepository();
const manageEmployees = new ManageEmployees(employeeRepo, shiftRepo);
const getDashboardStatsUseCase = new GetDashboardStats(
  manageEmployees,
  absenceRepo,
  shiftRepo,
  calendarRepo,
);

export interface GroupedEmployeeRecord {
  id: string;
  userId: string;
  workerName: string;
  employeeNumber: string;
  department?: string;
  shiftName: string;
  totalAttendances: number;
  expectedAttendances: number;
  totalLates: number;
  totalUnjustified: number;
  totalPermissions: number;
  dailyRecords: DashboardTableRecord[];
}

export default function AdminOverview() {
  const [dateRange, setDateRange] = useState({
    start: new Date().toLocaleDateString("en-CA"),
    end: new Date().toLocaleDateString("en-CA"),
  });

  const [selectedShift, setSelectedShift] = useState<string>("Todos");
  const [availableShifts, setAvailableShifts] = useState<string[]>(["Todos"]);
  const [records, setRecords] = useState<DashboardTableRecord[]>([]);
  const [tableData, setTableData] = useState<DashboardTableRecord[]>([]);
  const [isFetchingNetwork, setIsFetchingNetwork] = useState(true);
  const [isCalculating, setIsCalculating] = useState(true);

  // Estados Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] =
    useState<GroupedEmployeeRecord | null>(null);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    expectedToday: 0,
    totalAbsences: 0,
    faltasInjustificadas: 0,
    isPollingNeeded: false,
  });

  const isSingleDay = dateRange.start === dateRange.end;

  useEffect(() => {
    const unsubscribe = listenAttendancesUseCase.execute(dateRange, (data) => {
      setRecords(data as DashboardTableRecord[]);
      setIsFetchingNetwork(false);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dateRange]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const fetchStats = async () => {
      setIsCalculating(true);
      const result = await getDashboardStatsUseCase.execute(dateRange, records);
      setStats(result);
      if (result.fullTableData) setTableData(result.fullTableData);
      else setTableData(records);
      setIsCalculating(false);

      if (!result.isPollingNeeded && intervalId) clearInterval(intervalId);
    };

    if (!isFetchingNetwork) fetchStats();

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (dateRange.start === todayStr && dateRange.end === todayStr) {
      intervalId = setInterval(() => {
        if (!isFetchingNetwork) fetchStats();
      }, 60000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [dateRange, records, isFetchingNetwork]);

  useEffect(() => {
    const fetchAllShifts = async () => {
      try {
        const shifts = await shiftRepo.getAllShifts();
        // Extraemos los nombres únicos y los ordenamos alfabéticamente (opcional)
        const shiftNames = Array.from(
          new Set(shifts.map((s) => s.name)),
        ).sort();
        setAvailableShifts(["Todos", ...shiftNames]);
      } catch (error) {
        console.error("Error cargando los turnos para los filtros", error);
      }
    };
    fetchAllShifts();
  }, []);

  const groupedAndFilteredData = useMemo(() => {
    const groupedMap = new Map<string, GroupedEmployeeRecord>();

    tableData.forEach((record) => {
      if (!groupedMap.has(record.userId)) {
        groupedMap.set(record.userId, {
          id: record.userId,
          userId: record.userId,
          workerName: record.workerName,
          employeeNumber: record.employeeNumber,
          department: record.department,
          shiftName: record.shiftName || "Sin Turno", // 🌟 GUARDAMOS EL TURNO
          totalAttendances: 0,
          expectedAttendances: 0,
          totalLates: 0,
          totalUnjustified: 0,
          totalPermissions: 0,
          dailyRecords: [],
        });
      }
      const emp = groupedMap.get(record.userId)!;
      emp.dailyRecords.push(record);

      if (record.isJustified) emp.totalPermissions++;
      else if (record.status === "ABSENT") emp.totalUnjustified++;
      else {
        emp.totalAttendances++;
        if (record.periods?.some((p: WorkPeriod) => p.isLate)) emp.totalLates++;
      }
    });

    let result = Array.from(groupedMap.values()).map((emp) => {
      emp.expectedAttendances =
        emp.totalAttendances + emp.totalUnjustified + emp.totalPermissions;
      emp.dailyRecords.sort((a, b) => b.date.localeCompare(a.date));
      return emp;
    });

    // 🌟 FILTRAMOS POR TURNO EN LUGAR DE DEPARTAMENTO
    if (selectedShift !== "Todos") {
      result = result.filter((emp) => emp.shiftName === selectedShift);
    }
    return result.sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [tableData, selectedShift]);

  const handleOpenDetail = (emp: GroupedEmployeeRecord) => {
    setSelectedEmployeeDetail(emp);
    setIsDetailModalOpen(true);
  };

  const columns = useMemo(() => {
    const cols: ColumnDef<GroupedEmployeeRecord>[] = [
      {
        header: "Empleado",
        sortable: true,
        accessorKey: "workerName",
        className: "pl-6 w-[22%] min-w-[195px]",
        cell: (row) => {
          const colorClass = getAvatarColor(row.workerName);
          return (
            <div className="flex items-center gap-3 py-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm shrink-0 ${colorClass}`}
              >
                {row.workerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-slate-800 text-[13px] whitespace-normal line-clamp-2 leading-tight">
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
        header: isSingleDay ? "Fecha" : "Rango",
        className: "w-[8%]",
        cell: () => {
          const startDate = new Date(
            dateRange.start + "T12:00:00",
          ).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
          const endDate = new Date(
            dateRange.end + "T12:00:00",
          ).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
          return (
            <div className="flex items-start gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600 text-[11px] font-medium capitalize whitespace-nowrap">
                {isSingleDay ? startDate : `${startDate} - ${endDate}`}
              </span>
            </div>
          );
        },
      },
      {
        header: "Departamento",
        sortable: true,
        accessorKey: "department",
        cell: (row) => (
          <div className="flex justify-start px-4">
            <span className="inline-flex text-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 leading-[1.2] whitespace-normal wrap-break-word ">
              {row.department}
            </span>
          </div>
        ),
      },
      {
        header: "Turno Asignado",
        sortable: true,
        accessorKey: "shiftName",
        cell: (row) => (
          <div className="flex justify-start px-4">
            <span className="inline-flex text-center px-2 py-1 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100/60 leading-[1.2] whitespace-normal wrap-break-word ">
              {row.shiftName}
            </span>
          </div>
        ),
      },
    ];

    if (isSingleDay) {
      cols.push({
        header: "Actividad (Entrada ➔ Salida)",
        sortable: false,
        className: "w-[20%]",
        cell: (row) => {
          const todayRecord = row.dailyRecords[0];
          if (!todayRecord) return null;

          return (
            <div className="flex flex-col gap-1.5 py-1">
              {todayRecord.periods.map((p: WorkPeriod, i) => {
                const isMissing = p.isAbsent || !p.checkIn;
                return (
                  <div
                    key={i}
                    className="flex items-center text-[12px] font-medium w-fit"
                  >
                    {isMissing ? (
                      <div className="flex items-center justify-start">
                        {todayRecord.isJustified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-xs font-normal border border-amber-100 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{" "}
                            Permiso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 text-xs font-normal border border-rose-100 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>{" "}
                            Falta
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.isLate ? "bg-orange-400" : "bg-emerald-400"}`}
                        ></span>
                        <span className="text-slate-700">
                          {formatTime(p.checkIn)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span
                          className={
                            p.checkOut ? "text-slate-600" : "text-blue-600"
                          }
                        >
                          {p.checkOut ? formatTime(p.checkOut) : "En turno"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        },
      });
    }

    cols.push(
      {
        header: "Total Asist.",
        sortable: true,
        accessorKey: "totalAttendances",
        cell: (row) => (
          <div className="flex flex-col items-start justify-center px-5">
            <span className="text-blue-600 text-[13px] font-semibold">
              {row.totalAttendances} / {row.expectedAttendances}
            </span>
            {row.totalLates > 0 && (
              <span className="text-slate-400 text-[10px]">
                ({row.totalLates}R)
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Total Faltas",
        sortable: true,
        accessorKey: "totalUnjustified",
        className: "text-center",
        cell: (row) => (
          <span
            className={`text-[13px] font-semibold ${row.totalUnjustified > 0 ? "text-rose-600" : "text-slate-400"}`}
          >
            {row.totalUnjustified > 0 ? row.totalUnjustified : "-"}
          </span>
        ),
      },
      {
        header: "Permisos",
        sortable: true,
        accessorKey: "totalPermissions",
        className: "text-center",
        cell: (row) => (
          <span className="text-slate-500 text-[13px] font-normal">
            {row.totalPermissions > 0 ? row.totalPermissions : "-"}
          </span>
        ),
      },
    );

    if (!isSingleDay) {
      cols.push({
        header: "Acciones",
        className: "text-center pr-6",
        cell: (row) => (
          <button
            onClick={() => handleOpenDetail(row)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Ver historial detallado"
          >
            <Eye size={18} />
          </button>
        ),
      });
    }

    return cols;
  }, [isSingleDay, dateRange]);

  const attendancePercentage =
    stats.expectedToday > 0 ? (records.length / stats.expectedToday) * 100 : 0;
  const isFullyLoading = isFetchingNetwork || isCalculating;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Resumen Global"
        description="Monitoreo de asistencia y rendimiento por fechas."
        dateRange={dateRange}
        onDateRangeChange={(val) => {
          setIsFetchingNetwork(true);
          setDateRange(val);
        }}
        onExportCSV={() =>
          exportAdminOverviewToCSV(
            groupedAndFilteredData,
            `${dateRange.start}_al_${dateRange.end}`,
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40 transition-opacity">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Personal Activo
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {isFullyLoading ? "..." : stats.totalEmployees}
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

        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Asistencias
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {isFullyLoading ? "..." : records.length}{" "}
                <span className="text-xl text-slate-400 font-normal">
                  / {isFullyLoading ? "-" : stats.expectedToday}
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
                style={{
                  width: `${isFullyLoading ? 0 : attendancePercentage}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Turnos esperados en el rango
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Permisos
              </p>
              <h3 className="text-4xl font-semibold text-slate-800 tracking-tight">
                {isFullyLoading ? "..." : stats.totalAbsences}
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

        <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-xs flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Faltas Injust.
              </p>
              <h3 className="text-4xl font-semibold text-rose-600 tracking-tight">
                {isFullyLoading ? "..." : stats.faltasInjustificadas}
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
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Actividad Filtrada
          </h3>

          <ShiftFilterPills
            shiftsList={availableShifts}
            selectedShift={selectedShift}
            onSelect={setSelectedShift}
          />
        </div>

        <DataTable
          columns={columns}
          data={groupedAndFilteredData}
          isLoading={isFullyLoading}
          loadingText="Calculando registros..."
          emptyText="No hay registros para este rango o departamento."
        />
      </div>

      {/* 🌟 AQUÍ LLAMAMOS AL MODAL EXTRAÍDO */}
      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={selectedEmployeeDetail}
      />
    </div>
  );
}
