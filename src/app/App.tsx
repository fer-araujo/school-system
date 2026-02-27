import { Routes, Route, Link, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  Calendar,
  Users,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import AdminDashboard from "./pages/AdminDashboard";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-school-secondary text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold">School System</h2>
          <p className="text-sm text-slate-400 mt-1">{user?.fullName}</p>
          <span className="text-xs font-semibold bg-school-primary px-2 py-0.5 rounded mt-2 inline-block">
            {user?.role}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 p-2 rounded hover:bg-slate-800"
          >
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link
            to="/scan"
            className="flex items-center gap-3 p-2 rounded hover:bg-slate-800"
          >
            <QrCode size={20} /> Escanear QR
          </Link>
          <Link
            to="/attendance"
            className="flex items-center gap-3 p-2 rounded hover:bg-slate-800"
          >
            <Calendar size={20} /> Asistencias
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              to="/admin/attendance"
              className="flex items-center gap-3 p-2 rounded hover:bg-slate-800"
            >
              <Users size={20} /> Personal
            </Link>
          )}
        </nav>
        <button
          onClick={logout}
          className="p-4 flex items-center gap-3 hover:bg-red-900 mt-auto transition-colors"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
};

export default function App() {
  const { user, loading } = useAuth();

  // Pantalla de carga mientras Firebase revisa si hay sesión activa
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-school-primary" />
      </div>
    );
  }

  // Si NO hay usuario, solo mostramos el Login
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Si HAY usuario, mostramos el sistema protegido
  return (
    <MainLayout>
      <Routes>
        <Route path="/admin/attendance" element={<AdminDashboard />} />
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/scan"
          element={<Scanner />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
