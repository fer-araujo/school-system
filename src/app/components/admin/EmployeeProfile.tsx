import { useState, useEffect } from "react";
import {
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  UserMinus,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { User } from "../../../domain/models/User";
import { getAvatarColor } from "../../../utils/helpers";
import {
  GetEmployeeStats,
  type ActivityItem,
} from "../../../application/use-cases/GetEmployeeStats";
import CustomDatePicker from "../ui/CustomDatePicker"; // 🌟 Importamos nuestro datepicker
import { ManageEmployees } from "../../../application/use-cases/ManageEmployees";
import { FirebaseAttendanceRepository } from "../../../infrastructure/repositories/FirebaseAttendanceRepository";
import { FirebaseAbsenceRepository } from "../../../infrastructure/repositories/FirebaseAbsenceRepository";
import { FirebaseShiftRepository } from "../../../infrastructure/repositories/FirebaseShiftRepository";
import { FirebaseCalendarRepository } from "../../../infrastructure/repositories/FirebaseCalendarRepository";
import Pagination from "../ui/Pagination";
import { FirebaseEmployeeRepository } from "../../../infrastructure/repositories/FirebaseEmployeeRepository";

interface EmployeeProfileProps {
  user: User;
}

const employeeRepo = new FirebaseEmployeeRepository();
const attendanceRepo = new FirebaseAttendanceRepository();
const absenceRepo = new FirebaseAbsenceRepository();
const shiftRepo = new FirebaseShiftRepository();
const calendarRepo = new FirebaseCalendarRepository();
const manageEmployees = new ManageEmployees(employeeRepo, shiftRepo);

const getStatsUseCase = new GetEmployeeStats(
  manageEmployees,
  attendanceRepo,
  absenceRepo,
  shiftRepo,
  calendarRepo,
);

export default function EmployeeProfile({ user }: EmployeeProfileProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: firstDay.toLocaleDateString("en-CA"),
      end: today.toLocaleDateString("en-CA"),
    };
  });

  const [stats, setStats] = useState({
    totalAttendances: 0,
    totalLates: 0,
    totalAbsences: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setIsLoading(true);
      try {
        // 🚨 ADVERTENCIA: Este caso de uso necesitará modificarse para aceptar el dateRange
        const result = await getStatsUseCase.execute(user.id, dateRange);
        setStats(result.stats);
        setRecentActivity(result.recentActivity);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error cargando expediente:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user.id) fetchEmployeeData();
  }, [user.id, dateRange]); // 🌟 Se vuelve a ejecutar si cambian las fechas

  const avatarColor = getAvatarColor(user.fullName);

  if (isLoading && recentActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium text-sm">
          Recopilando expediente...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* CABECERA DEL PERFIL */}
      <div className="bg-slate-50/50 -mt-8 -mx-8 mb-8 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-blue-50/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-emerald-50/50 rounded-full blur-3xl"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div
            className={`w-16 h-16 rounded-full border-2 border-white flex items-center justify-center text-2xl font-bold shadow-sm ${avatarColor}`}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {user.fullName}
            </h2>
            <div className="flex gap-2 mt-2">
              <span className="bg-white/60 text-slate-600 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border border-slate-200/50 shadow-sm backdrop-blur-sm">
                NO. EMP: {user.employeeNumber || "N/A"}
              </span>
              <span className="bg-blue-50/60 text-blue-600 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border border-blue-100/50 shadow-sm backdrop-blur-sm">
                {user.department || "Sin Área"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 FILTRO DE FECHAS */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          Resumen del Periodo
        </h3>
        <div className="w-full sm:w-auto z-50">
          <CustomDatePicker
            mode="range"
            value={dateRange}
            onChange={(val) =>
              setDateRange(val as { start: string; end: string })
            }
            placeholder="Filtrar por fechas..."
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* MÉTRICAS RÁPIDAS */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-full mb-2">
                <Calendar size={18} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {stats.totalAttendances}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Días Laborados
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="bg-orange-100 text-orange-600 p-2 rounded-full mb-2">
                <Clock size={18} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {stats.totalLates}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Retardos
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="bg-rose-100 text-rose-600 p-2 rounded-full mb-2">
                <UserMinus size={18} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {stats.totalAbsences}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Ausencias
              </span>
            </div>
          </div>

          {/* HISTORIAL DETALLADO */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              Desglose de Actividad
            </h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 font-light text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                No hay registros para este empleado en el rango seleccionado.
              </p>
            ) : (
              <>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {recentActivity
                    .slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE,
                    )
                    .map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              act.type === "ATTENDANCE"
                                ? act.isLate
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-emerald-50 text-emerald-600"
                                : act.type === "HOLIDAY"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {act.type === "ATTENDANCE" ? (
                              act.isLate ? (
                                <AlertTriangle size={16} />
                              ) : (
                                <CheckCircle2 size={16} />
                              )
                            ) : act.type === "HOLIDAY" ? (
                              <Calendar size={16} />
                            ) : (
                              <UserMinus size={16} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {act.type === "ATTENDANCE"
                                ? "Asistencia Registrada"
                                : act.reason}
                            </p>
                            <p className="text-xs text-slate-400 font-light mt-0.5">
                              {act.date}
                            </p>
                          </div>
                        </div>
                        {/* BADGES */}
                        {act.type === "ATTENDANCE" && act.isLate && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                            Retardo
                          </span>
                        )}
                        {act.type === "ABSENCE" && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 truncate max-w-25"
                            title={act.notes}
                          >
                            Permiso
                          </span>
                        )}
                        {act.type === "UNJUSTIFIED" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                            Falta
                          </span>
                        )}
                        {act.type === "HOLIDAY" && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                            Día Festivo
                          </span>
                        )}
                      </div>
                    ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={recentActivity.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
