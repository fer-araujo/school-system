import { useState, useEffect } from "react";
import { ManageEmployees } from "../../../application/use-cases/ManageEmployees";
import { ManageShifts } from "../../../application/use-cases/ManageShifts";
import { FirebaseShiftRepository } from "../../../infrastructure/repositories/FirebaseShiftRepository";
import type { User } from "../../../domain/models/User";
import type { Shift } from "../../../domain/models/Shift";
import { Loader2, UserPlus, Briefcase } from "lucide-react";

const manageEmployees = new ManageEmployees();
const shiftRepo = new FirebaseShiftRepository();
const manageShifts = new ManageShifts(shiftRepo);

export default function EmployeesTab() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Estados Formulario de Empleado
  const [empNo, setEmpNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Estados Asignación Masiva
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const loadData = async () => {
    try {
      const [workers, catalog] = await Promise.all([
        manageEmployees.getAllWorkers(),
        manageShifts.getCatalog(),
      ]);
      setEmployees(workers);
      setShifts(catalog);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- CREAR EMPLEADO ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await manageEmployees.createEmployee(email, password, fullName, empNo);
      setEmpNo("");
      setFullName("");
      setEmail("");
      setPassword("");
      await loadData();
      alert("Empleado registrado con éxito.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  // --- ASIGNACIÓN MASIVA ---
  const handleToggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const handleAssignMasive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0)
      return alert("Selecciona al menos un empleado.");

    setIsAssigning(true);
    try {
      // Simulamos la asignación masiva llamando el método en paralelo
      const promises = selectedUserIds.map((uid) =>
        manageShifts.assignToUser(uid, selectedShiftId, validFrom),
      );
      await Promise.all(promises);

      setSelectedUserIds([]);
      setSelectedShiftId("");
      alert(
        `Turno asignado a ${selectedUserIds.length} empleados correctamente.`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: ALTA DE EMPLEADOS */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-school-primary" /> Alta de
            Personal
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  No. Emp.
                </label>
                <input
                  type="text"
                  required
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
                  placeholder="001"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo (Usuario)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña (Mínimo 6)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none focus:border-school-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-slate-800 text-white font-medium py-2 rounded hover:bg-slate-900 transition-colors flex justify-center items-center"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Registrar Empleado"
              )}
            </button>
          </form>
        </div>

        {/* PANEL 2: ASIGNACIÓN DE TURNOS MASIVA */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-school-primary" /> Asignación de
            Turnos
          </h3>

          <form onSubmit={handleAssignMasive} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                1. Selecciona el Turno
              </label>
              <select
                required
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none bg-white"
              >
                <option value="">-- Catálogo de Turnos --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                2. Selecciona Empleados ({selectedUserIds.length} seleccionados)
              </label>
              <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-slate-50 p-2 space-y-1">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(emp.id)}
                      onChange={() => handleToggleUser(emp.id)}
                      className="w-4 h-4 text-school-primary rounded"
                    />
                    <span className="font-mono text-xs text-slate-500 w-8">
                      {emp.employeeNumber}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {emp.fullName}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                3. Válido Desde
              </label>
              <input
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAssigning}
              className="w-full bg-school-primary text-white font-medium py-2 rounded hover:bg-blue-700 transition-colors flex justify-center items-center"
            >
              {isAssigning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Vincular Horarios"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
