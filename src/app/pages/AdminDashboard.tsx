import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Users, CalendarDays, UserX, Clock } from "lucide-react";
import AttendanceTab from "../components/admin/AttendanceTab";
import CalendarTab from "../components/admin/CalendarTab";
import AbsencesTab from "../components/admin/AbsenceTab";
import ShiftsTab from "../components/admin/ShiftTab";

type TabType = "ATTENDANCE" | "CALENDAR" | "ABSENCES" | "SHIFTS";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("ATTENDANCE");

  if (user?.role !== "ADMIN")
    return <div className="p-4 text-red-600 font-bold">Acceso Denegado.</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        Centro de Mando
      </h1>

      {/* Navegación */}
      <div className="flex gap-4 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === "ATTENDANCE" ? "border-b-2 border-school-primary text-school-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Users className="w-5 h-5" /> Registro Diario
        </button>
        <button
          onClick={() => setActiveTab("CALENDAR")}
          className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === "CALENDAR" ? "border-b-2 border-school-primary text-school-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <CalendarDays className="w-5 h-5" /> Calendario General
        </button>
        <button
          onClick={() => setActiveTab("ABSENCES")}
          className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === "ABSENCES" ? "border-b-2 border-school-primary text-school-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <UserX className="w-5 h-5" /> Permisos e Incapacidades
        </button>
        <button
          onClick={() => setActiveTab("SHIFTS")}
          className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === "SHIFTS" ? "border-b-2 border-school-primary text-school-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Clock className="w-5 h-5" /> Gestión de Turnos
        </button>
      </div>

      {/* Renderizado Condicional Limpio */}
      {activeTab === "ATTENDANCE" && <AttendanceTab />}
      {activeTab === "CALENDAR" && <CalendarTab />}
      {activeTab === "ABSENCES" && <AbsencesTab />}
      {activeTab === "SHIFTS" && <ShiftsTab />}
    </div>
  );
}
