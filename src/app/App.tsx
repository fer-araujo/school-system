import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

import Sidebar from "./components/ui/Sidebar";
import Login from "./pages/Login";
import AdminOverview from "./pages/AdminOverview";
import Scanner from "./pages/Scanner";
import EmployeesPage from "./pages/EmployeesPage";
import ShiftsPage from "./pages/ShiftPage";
import AbsencesPage from "./pages/AbsencesPage";
import HolidaysPage from "./pages/HolidaysPage";

// --- MAIN LAYOUT (Con Sidebar) ---
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30">
      <div className="absolute top-0 inset-x-0 h-96 bg-linear-to-b from-blue-100/40 to-transparent pointer-events-none"></div>
      <Sidebar />
      <main className="flex-1 overflow-x-hidden relative flex flex-col min-h-screen">
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

  // --- RENDERIZADO POR ROL ---

  // 1. Si es SCANNER: Solo ve la terminal (Sin Sidebar)
  if (user.role === "SCANNER") {
    return (
      <>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/scanner" element={<Scanner />} />
          <Route path="*" element={<Navigate to="/scanner" replace />} />
        </Routes>
      </>
    );
  }

  // 2. Si es ADMIN: Layout completo con Sidebar
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: "text-sm font-medium shadow-lg rounded-xl",
        }}
      />
      <MainLayout>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route path="/admin/dashboard" element={<AdminOverview />} />
          <Route path="/admin/scan" element={<Scanner />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/shifts" element={<ShiftsPage />} />
          <Route path="/admin/calendar" element={<HolidaysPage />} />
          <Route path="/admin/absences" element={<AbsencesPage />} />
          <Route
            path="*"
            element={<Navigate to="/admin/dashboard" replace />}
          />
        </Routes>
      </MainLayout>
    </>
  );
}
