import { useState } from "react";
import {
  LayoutDashboard,
  QrCode,
  CalendarDays,
  Users,
  LogOut,
  Clock,
  UserX,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NavItem from "./NavItem";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-800 flex flex-col relative shrink-0 transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Glow effect sutil de fondo */}
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>

      {/* HEADER DEL SIDEBAR NUEVO Y FLUIDO */}
      <div
        className={`border-b border-slate-800/60 z-10 transition-all duration-300 flex flex-col ${isCollapsed ? "p-4 items-center" : "p-6"}`}
      >
        {/* Fila superior: Logo y Botón */}
        <div
          className={`flex items-center w-full mb-6 ${isCollapsed ? "justify-center" : "justify-between"}`}
        >
          {/* Logo y Nombre (Se ocultan completamente si está colapsado para evitar choques) */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
                School<span className="text-blue-500">System</span>
              </h2>
            </div>
          )}

          {/* EL BOTÓN (Se centra y se hace cuadrado si está colapsado) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-slate-400 cursor-pointer hover:text-white hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center shrink-0 ${isCollapsed ? "w-10 h-10 bg-slate-800/40 border border-slate-700/50 shadow-sm" : "p-1.5"}`}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        {/* Info del Usuario */}
        <div
          className={`bg-slate-900/50 rounded-xl border border-slate-800 flex items-center transition-all duration-300 ${isCollapsed ? "p-1.5 justify-center w-11 h-11" : "p-3 gap-3 w-full"}`}
        >
          <div className="w-8 h-8 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm ring-1 ring-slate-700 uppercase">
            {user?.fullName.charAt(0) || "U"}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm text-slate-200 font-medium truncate">
                {user?.fullName}
              </p>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded">
                {user?.role}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* NAVEGACIÓN */}
      <nav
        className={`flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden z-10 transition-all duration-300 ${isCollapsed ? "p-3" : "p-4"}`}
      >
        {/* CORRECCIÓN 1: Solo mostrar 'Personal' si el usuario NO es ADMIN */}
        {!isCollapsed && user?.role !== "ADMIN" && (
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2 transition-all">
            Personal
          </div>
        )}

        {user?.role !== "ADMIN" && (
          <NavItem
            to="/"
            icon={LayoutDashboard}
            label="Mi Gafete"
            isCollapsed={isCollapsed}
            end // <--- Propiedad opcional para match exacto
          />
        )}

        {user?.role === "ADMIN" && (
          <>
            {!isCollapsed && (
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2 transition-all">
                Administración
              </div>
            )}

            {/* CORRECCIÓN 2: Le pasamos 'end' para que solo se ilumine en coincidencia exacta */}
            <NavItem
              to="/admin"
              icon={LayoutDashboard}
              label="Resumen Global"
              isCollapsed={isCollapsed}
              end
            />
            <NavItem
              to="/admin/scan"
              icon={QrCode}
              label="Escanear QR"
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/admin/employees"
              icon={Users}
              label="Gestión de Personal"
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/admin/shifts"
              icon={Clock}
              label="Turnos y Horarios"
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/admin/calendar"
              icon={CalendarDays}
              label="Calendario Escolar"
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/admin/absences"
              icon={UserX}
              label="Permisos"
              isCollapsed={isCollapsed}
            />
          </>
        )}
      </nav>

      {/* FOOTER - CERRAR SESIÓN */}
      <div
        className={`p-4 z-10 border-t border-slate-800/60 transition-all duration-300 ${isCollapsed ? "flex justify-center" : ""}`}
      >
        <button
          onClick={logout}
          className={`flex items-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors group font-medium rounded-xl ${
            isCollapsed ? "p-3 justify-center" : "w-full gap-3 px-4 py-3"
          }`}
          title={isCollapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!isCollapsed && (
            <span className="whitespace-nowrap">Cerrar Sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
}
