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

interface EmployeeProfileProps {
  user: User;
}

const getStatsUseCase = new GetEmployeeStats();

export default function EmployeeProfile({ user }: EmployeeProfileProps) {
  const [isLoading, setIsLoading] = useState(true);
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
        const result = await getStatsUseCase.execute(user.id);
        setStats(result.stats);
        setRecentActivity(result.recentActivity);
      } catch (error) {
        console.error("Error cargando expediente:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user.id) fetchEmployeeData();
  }, [user.id]);

  const avatarColor = getAvatarColor(user.fullName);

  if (isLoading) {
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
            {/* Textos oscuros para que resalten en el fondo claro */}
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {user.fullName}
            </h2>
            <p className="text-slate-500 text-sm font-light mt-0.5">
              {user.email}
            </p>
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

      {/* HISTORIAL RECIENTE */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          Últimos 5 Movimientos
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-400 font-light text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            No hay registros recientes para este empleado.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${act.type === "ATTENDANCE" ? (act.isLate ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600") : "bg-rose-50 text-rose-600"}`}
                  >
                    {act.type === "ATTENDANCE" ? (
                      act.isLate ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
