import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

// --- COMPONENTES UI ---
import Sidebar from "./components/ui/Sidebar";

// --- PÁGINAS GENERALES ---
import Login from "./pages/Login";
import TeacherQRCard from "./pages/TeacherQR";
import ForcePasswordChange from "./pages/ForcePasswordChange";

// --- PÁGINAS ADMIN ---
import AdminOverview from "./pages/AdminOverview";
import Scanner from "./pages/Scanner";
import EmployeesPage from "./pages/EmployeesPage";
import ShiftsPage from "./pages/ShiftPage";
import AbsencesPage from "./pages/AbsencesPage";
import HolidaysPage from "./pages/HolidaysPage";

// --- MAIN LAYOUT ---
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 -z-10">
      <div className="absolute top-0 inset-x-0 h-96 bg-linear-to-b from-blue-100/40 to-transparent pointer-events-none"></div>
      <Sidebar />
      <main className="flex-1 overflow-x-hidden relative flex flex-col min-h-screen">
        <Toaster position="top-center" />
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

  // Si no hay usuario, mandarlo al login
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // <-- 2. LA TRAMPA DE SEGURIDAD (EL SECUESTRO) -->
  // Si el usuario existe, pero tiene la bandera activa, bloqueamos TODAS las rutas normales
  if (user.requiresPasswordChange) {
    return (
      <>
        <Toaster position="top-center" />
        <ForcePasswordChange />
      </>
    );
  }

  // 3. Si pasa las validaciones, le mostramos el sistema normal
  return (
    <MainLayout>
      <Routes>
        {/* Rutas Compartidas / Trabajador */}
        <Route
          path="/"
          element={
            user.role === "ADMIN" ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <TeacherQRCard />
            )
          }
        />

        {/* Rutas Exclusivas ADMIN */}
        {user.role === "ADMIN" && (
          <>
            <Route path="/admin/dashboard" element={<AdminOverview />} />
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
