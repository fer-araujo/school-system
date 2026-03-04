import { useState, useRef, useEffect } from "react";
import {
  QrCode,
  XCircle,
  User as UserIcon,
  Clock,
  LogOut,
  LogIn,
} from "lucide-react";
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { ProcessAttendanceScan } from "../../application/use-cases/ProcessAttendance";

type ScanStatus = "idle" | "loading" | "success" | "error";

// Inicializamos el "Cerebro"
const attendanceRepo = new FirebaseAttendanceRepository();
const processScanUseCase = new ProcessAttendanceScan(attendanceRepo);

export default function Scanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("Esperando escaneo...");
  const [scannedValue, setScannedValue] = useState("");

  const [employeeInfo, setEmployeeInfo] = useState<{
    name: string;
    time: string;
    isLate: boolean;
    type: "ENTRY" | "EXIT";
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Mantiene el "foco" en el input oculto para que el escáner de pistola siempre funcione
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && status === "idle") {
        inputRef.current.focus();
      }
    };
    focusInput();
    document.addEventListener("click", focusInput);
    return () => document.removeEventListener("click", focusInput);
  }, [status]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedValue.trim()) return;

    setStatus("loading");
    setMessage("Verificando identidad...");

    const qrCode = scannedValue.trim();
    setScannedValue(""); // Limpiamos rápido para el siguiente maestro

    try {
      // AQUÍ OCURRE LA MAGIA
      const result = await processScanUseCase.execute(qrCode);

      setStatus("success");
      setMessage(
        result.type === "ENTRY"
          ? "¡Entrada Registrada!"
          : "¡Salida Registrada!",
      );
      setEmployeeInfo({
        name: result.employeeName,
        time: result.time,
        isLate: result.isLate,
        type: result.type as "ENTRY" | "EXIT",
      });

      // Después de 3.5 segundos, la pantalla vuelve a la normalidad
      setTimeout(() => {
        setStatus("idle");
        setMessage("Esperando escaneo...");
        setEmployeeInfo(null);
      }, 3500);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(
        (error instanceof Error ? error.message : String(error)) || "Error al registrar la asistencia."
      );

      setTimeout(() => {
        setStatus("idle");
        setMessage("Esperando escaneo...");
      }, 3500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 selection:bg-transparent">
      {/* INPUT OCULTO PARA EL ESCÁNER FÍSICO */}
      <form
        onSubmit={handleScanSubmit}
        className="absolute opacity-0 pointer-events-none"
      >
        <input
          ref={inputRef}
          type="text"
          value={scannedValue}
          onChange={(e) => setScannedValue(e.target.value)}
          autoFocus
          autoComplete="off"
        />
        <button type="submit">Submit</button>
      </form>

      {/* INTERFAZ DEL KIOSCO */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-500">
        <div
          className={`p-8 text-center transition-colors duration-500 flex flex-col items-center justify-center min-h-55 ${
            status === "idle"
              ? "bg-slate-50"
              : status === "loading"
                ? "bg-blue-50"
                : status === "success"
                  ? employeeInfo?.type === "ENTRY"
                    ? "bg-emerald-50"
                    : "bg-indigo-50"
                  : "bg-rose-50"
          }`}
        >
          <div
            className={`p-4 rounded-full mb-4 transition-transform duration-500 ${status !== "idle" ? "scale-110" : ""} ${
              status === "idle"
                ? "bg-white text-slate-400 shadow-sm"
                : status === "loading"
                  ? "bg-blue-100 text-blue-600 animate-pulse"
                  : status === "success"
                    ? employeeInfo?.type === "ENTRY"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-indigo-100 text-indigo-600"
                    : "bg-rose-100 text-rose-600"
            }`}
          >
            {status === "idle" && <QrCode size={48} strokeWidth={1.5} />}
            {status === "loading" && <Clock size={48} strokeWidth={1.5} />}
            {status === "success" && employeeInfo?.type === "ENTRY" && (
              <LogIn size={48} strokeWidth={1.5} />
            )}
            {status === "success" && employeeInfo?.type === "EXIT" && (
              <LogOut size={48} strokeWidth={1.5} />
            )}
            {status === "error" && <XCircle size={48} strokeWidth={1.5} />}
          </div>

          <h2
            className={`text-2xl font-bold tracking-tight ${
              status === "idle"
                ? "text-slate-700"
                : status === "loading"
                  ? "text-blue-700"
                  : status === "success"
                    ? employeeInfo?.type === "ENTRY"
                      ? "text-emerald-700"
                      : "text-indigo-700"
                    : "text-rose-700"
            }`}
          >
            {message}
          </h2>

          {status === "idle" && (
            <p className="text-slate-400 mt-2 text-sm font-medium">
              Acerca tu código QR al escáner
            </p>
          )}
        </div>

        {/* DETALLES DEL EMPLEADO (Solo visible en éxito) */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${status === "success" ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {employeeInfo && (
            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">
                    {employeeInfo.name}
                  </p>
                  <p className="text-slate-500 text-sm flex items-center gap-1.5">
                    <Clock size={14} />
                    {employeeInfo.type === "ENTRY" ? "Entrada" : "Salida"}{" "}
                    registrada a las {employeeInfo.time}
                  </p>
                </div>
              </div>

              {employeeInfo.isLate && employeeInfo.type === "ENTRY" && (
                <div className="bg-orange-50 text-orange-700 px-4 py-2.5 rounded-lg text-sm font-semibold border border-orange-200/50 flex items-center gap-2">
                  <XCircle size={16} /> Registrado con retardo
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-slate-400 text-sm font-medium uppercase tracking-widest">
        Sistema de Control de Asistencia
      </div>
    </div>
  );
}
