import { Routes, Route, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  CalendarDays,
  Users,
  LogOut,
  Loader2,
  Clock,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";

// --- COMPONENTES UI ---
// Asumiendo que creaste la carpeta ui como mencionaste
import NavItem from "./components/ui/NavItem";

// --- PÁGINAS GENERALES ---
import Login from "./pages/Login";
import Dashboard from "./pages/TeacherQR";
import Scanner from "./pages/Scanner";

// --- PÁGINAS ADMIN (Las nuevas) ---
import AdminOverview from "./pages/AdminOverview";
import EmployeesPage from "./pages/EmployeesPage";
import ShiftsPage from "./pages/ShiftPage";
import AbsencesPage from "./pages/AbsencesPage";
import HolidaysPage from "./pages/HolidaysPage";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 -z-10">
      <div className="absolute top-0 inset-x-0 h-96 bg-linear-to-b from-blue-100/40 to-transparent pointer-events-none"></div>
      {/* SIDEBAR CINEMÁTICO */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col relative overflow-hidden shrink-0">
        {/* Glow effect sutil de fondo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>

        <div className="p-6 border-b border-slate-800/60 z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                School<span className="text-blue-500">System</span>
              </h2>
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm ring-1 ring-slate-700 uppercase">
              {user?.fullName.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-slate-200 font-medium truncate">
                {user?.fullName}
              </p>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto z-10">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">
            Personal
          </div>

          {/* Ocultamos el Gafete si es ADMIN */}
          {user?.role !== "ADMIN" && (
            <NavItem to="/" icon={LayoutDashboard} label="Mi Gafete" />
          )}

          {user?.role === "ADMIN" && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-8">
                Administración
              </div>
              <NavItem
                to="/admin"
                icon={LayoutDashboard}
                label="Resumen Global"
              />
              <NavItem to="/scan" icon={QrCode} label="Escanear QR" />
              <NavItem
                to="/admin/employees"
                icon={Users}
                label="Gestión de Personal"
              />
              <NavItem
                to="/admin/shifts"
                icon={Clock}
                label="Turnos y Horarios"
              />
              <NavItem
                to="/admin/calendar"
                icon={CalendarDays}
                label="Calendario Escolar"
              />
              <NavItem to="/admin/absences" icon={UserX} label="Permisos" />
            </>
          )}
        </nav>

        <div className="p-4 z-10 border-t border-slate-800/60">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors group font-medium"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />{" "}
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-x-hidden relative flex flex-col min-h-screen">
        {/* Glow effect sutil superior */}
        <div className="relative z-10 flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        {/* Rutas Compartidas / Trabajador */}
        <Route
          path="/"
          element={
            user.role === "ADMIN" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Dashboard />
            )
          }
        />{" "}
        {/* Rutas Exclusivas ADMIN */}
        {user.role === "ADMIN" && (
          <>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/scan" element={<Scanner />} />
            <Route path="/admin/employees" element={<EmployeesPage />} />
            <Route path="/admin/shifts" element={<ShiftsPage />} />
            <Route path="/admin/calendar" element={<HolidaysPage />} />
            <Route path="/admin/absences" element={<AbsencesPage />} />
          </>
        )}
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
