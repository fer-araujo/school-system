import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  ArrowRight,
  Calendar as CalendarIcon,
  Eye,
  Clock,
  AlertTriangle,
  X,
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
import StatCard from "../components/ui/StatCard";
import { FirebaseAttendanceNoteRepository } from "../../infrastructure/repositories/FirebaseAttendanceNoteRepository";
import { ManageAttendanceNotes } from "../../application/use-cases/ManageAttendanceNotes";
import type { AttendanceNote } from "../../domain/models/AttendanceNote";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

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
const noteRepo = new FirebaseAttendanceNoteRepository();
const manageNotesUseCase = new ManageAttendanceNotes(noteRepo);

/** Short labels for the amber marker on an out-of-schedule check-in. */
const ANOMALY_LABELS: Record<string, string> = {
  NO_SHIFT_ASSIGNED: "Sin turno asignado",
  SHIFT_NOT_FOUND: "Turno inexistente",
  REST_DAY: "Día de descanso",
  NO_BLOCKS_CONFIGURED: "Sin horarios ese día",
};

/**
 * Each stat card doubles as a filter on the table below it. "none" is what
 * the Personal Activo card selects, since the whole roster is what that card
 * counts.
 */
type StatFilter = "none" | "attendances" | "lates" | "permissions" | "absences";

const STAT_FILTERS: Record<
  Exclude<StatFilter, "none">,
  {
    label: string;
    chip: string;
    emptyText: string;
    predicate: (emp: GroupedEmployeeRecord) => boolean;
  }
> = {
  attendances: {
    label: "Solo con asistencias",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    emptyText: "Nadie registró asistencia en este rango.",
    predicate: (emp) => emp.totalAttendances > 0,
  },
  lates: {
    label: "Solo con retardos",
    chip: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    emptyText: "Nadie llegó tarde en este rango.",
    predicate: (emp) => emp.totalLates > 0,
  },
  permissions: {
    label: "Solo con permisos",
    chip: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    emptyText: "Nadie tuvo permisos en este rango.",
    predicate: (emp) => emp.totalPermissions > 0,
  },
  absences: {
    label: "Solo con faltas",
    chip: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
    emptyText: "Nadie tuvo faltas injustificadas en este rango.",
    predicate: (emp) => emp.totalUnjustified > 0,
  },
};

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
  const { user } = useAuth();
  const [notesByDate, setNotesByDate] = useState<Record<string, AttendanceNote>>(
    {},
  );
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const openDetailForRef = useRef<string | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] =
    useState<GroupedEmployeeRecord | null>(null);

  const [statFilter, setStatFilter] = useState<StatFilter>("none");

  // Clicking the active card clears it, so a card is both the way in and the
  // way out of its own filter.
  const toggleStatFilter = (filter: StatFilter) =>
    setStatFilter((current) => (current === filter ? "none" : filter));

  const [stats, setStats] = useState({
    totalEmployees: 0,
    expectedToday: 0,
    totalAbsences: 0,
    faltasInjustificadas: 0,
    employeesWithLates: 0,
    lateUserIds: [] as string[],
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
    if (statFilter !== "none") {
      result = result.filter(STAT_FILTERS[statFilter].predicate);
    }
    return result.sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [tableData, selectedShift, statFilter]);

  // Memoised because the columns useMemo closes over it and it now depends on
  // the selected range.
  const handleOpenDetail = useCallback(async (emp: GroupedEmployeeRecord) => {
    setSelectedEmployeeDetail(emp);
    setIsDetailModalOpen(true);
    setNotesByDate({});
    setIsLoadingNotes(true);
    // Opening a second employee before the first load returns would otherwise
    // paint one person's notes onto another's history.
    openDetailForRef.current = emp.userId;

    try {
      const notes = await manageNotesUseCase.getForRange(
        emp.userId,
        dateRange.start,
        dateRange.end,
      );
      if (openDetailForRef.current !== emp.userId) return;
      setNotesByDate(Object.fromEntries(notes.map((n) => [n.date, n])));
    } catch (error) {
      console.error("Error cargando observaciones", error);
      if (openDetailForRef.current === emp.userId) {
        toast.error("No se pudieron cargar las observaciones.");
      }
    } finally {
      if (openDetailForRef.current === emp.userId) setIsLoadingNotes(false);
    }
  }, [dateRange]);

  const handleSaveNote = async (userId: string, date: string, text: string) => {
    await manageNotesUseCase.save({
      userId,
      date,
      text,
      authorName: user?.fullName,
    });

    const trimmed = text.trim();
    setNotesByDate((current) => {
      const next = { ...current };
      if (!trimmed) {
        delete next[date];
        return next;
      }
      next[date] = {
        id: `${userId}_${date}`,
        userId,
        date,
        text: trimmed,
        authorName: user?.fullName,
        updatedAt: new Date(),
      };
      return next;
    });

    toast.success(trimmed ? "Observación guardada." : "Observación eliminada.");
  };

  const columns = useMemo(() => {
    // Declared as one list so the visual order is the source order. The two
    // conditional columns are placed inline instead of pushed at the end.
    const empleadoCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "workerName",
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
    };

    const fechaCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "date",
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
    };

    const departamentoCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "department",
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
    };

    const turnoCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "shiftName",
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
    };

    const actividadCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "activity",
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
                        {p.anomaly && (
                          <span
                            title={
                              ANOMALY_LABELS[p.anomaly.code] ??
                              "Fuera de horario"
                            }
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-medium"
                          >
                            <AlertTriangle size={10} />
                            {p.anomaly.code === "REST_DAY" && p.anomaly.detail
                              ? p.anomaly.detail
                              : (ANOMALY_LABELS[p.anomaly.code] ??
                                "Fuera de horario")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        },
    };

    const totalAsistCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "totalAttendances",
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
    };

    const totalFaltasCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "totalUnjustified",
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
    };

    const permisosCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "totalPermissions",
        header: "Permisos",
        sortable: true,
        accessorKey: "totalPermissions",
        className: "text-center",
        cell: (row) => (
          <span className="text-slate-500 text-[13px] font-normal">
            {row.totalPermissions > 0 ? row.totalPermissions : "-"}
          </span>
        ),
    };

    const accionesCol: ColumnDef<GroupedEmployeeRecord> = {
        id: "actions",
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
    };

    return [
      empleadoCol,
      fechaCol,
      isSingleDay ? actividadCol : null,
      departamentoCol,
      turnoCol,
      totalAsistCol,
      totalFaltasCol,
      permisosCol,
      isSingleDay ? null : accionesCol,
    ].filter((c): c is ColumnDef<GroupedEmployeeRecord> => c !== null);
  }, [isSingleDay, dateRange, handleOpenDetail]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        <StatCard
          label="Personal Activo"
          value={stats.totalEmployees}
          icon={<Users className="w-5 h-5" />}
          accent="blue"
          footer="Total de Personal"
          isLoading={isFullyLoading}
          onClick={() => setStatFilter("none")}
          isActive={statFilter === "none"}
        />

        <StatCard
          label="Asistencias"
          value={
            <>
              {records.length}{" "}
              <span className="text-xl text-slate-400 font-normal">
                / {stats.expectedToday}
              </span>
            </>
          }
          icon={<UserCheck className="w-5 h-5" />}
          accent="emerald"
          isLoading={isFullyLoading}
          onClick={() => toggleStatFilter("attendances")}
          isActive={statFilter === "attendances"}
          footer="Del total programado"
        />

        <StatCard
          label="Retardos"
          value={
            <>
              {stats.employeesWithLates}{" "}
              <span className="text-xl text-slate-400 font-normal">
                / {stats.totalEmployees}
              </span>
            </>
          }
          icon={<Clock className="w-5 h-5" />}
          accent="orange"
          valueClassName={
            stats.employeesWithLates > 0 ? "text-orange-600" : "text-slate-800"
          }
          isLoading={isFullyLoading}
          footer="Llegadas fuera de tolerancia"
          onClick={() => toggleStatFilter("lates")}
          isActive={statFilter === "lates"}
        />

        <StatCard
          label="Permisos"
          value={stats.totalAbsences}
          icon={<UserMinus className="w-5 h-5" />}
          accent="amber"
          footer="Incapacidades / Vacaciones"
          isLoading={isFullyLoading}
          onClick={() => toggleStatFilter("permissions")}
          isActive={statFilter === "permissions"}
        />

        <StatCard
          label="Faltas Injust."
          value={stats.faltasInjustificadas}
          icon={<UserX className="w-5 h-5" />}
          accent="rose"
          valueClassName="text-rose-600"
          footer="Turnos pasados sin asistir"
          isLoading={isFullyLoading}
          onClick={() => toggleStatFilter("absences")}
          isActive={statFilter === "absences"}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Actividad Filtrada
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <ShiftFilterPills
              shiftsList={availableShifts}
              selectedShift={selectedShift}
              onSelect={setSelectedShift}
            />

            {/* The card counts everyone; this table is also filtered by shift,
                so both chips stay visible rather than silently disagreeing. */}
            {statFilter !== "none" && (
              <button
                onClick={() => setStatFilter("none")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${STAT_FILTERS[statFilter].chip}`}
              >
                {STAT_FILTERS[statFilter].label}
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={groupedAndFilteredData}
          isLoading={isFullyLoading}
          loadingText="Calculando registros..."
          emptyText={
            statFilter !== "none"
              ? STAT_FILTERS[statFilter].emptyText
              : "No hay registros para este rango o turno."
          }
        />
      </div>

      {/* 🌟 AQUÍ LLAMAMOS AL MODAL EXTRAÍDO */}
      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        employee={selectedEmployeeDetail}
        notesByDate={notesByDate}
        isLoadingNotes={isLoadingNotes}
        onSaveNote={handleSaveNote}
      />
    </div>
  );
}
