import { useState, useRef, useEffect } from "react";
import {
  QrCode,
  XCircle,
  User as UserIcon,
  Clock,
  LogOut,
  LogIn,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { ScheduleAnomaly } from "../../domain/models/User";
import { isScanRejectedError } from "../../domain/errors/ScanRejectedError";

// --- INFRAESTRUCTURA ---
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { FirebaseEmployeeRepository } from "../../infrastructure/repositories/FirebaseEmployeeRepository";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import { FirebaseCalendarRepository } from "../../infrastructure/repositories/FirebaseCalendarRepository";
import { FirebaseAbsenceRepository } from "../../infrastructure/repositories/FirebaseAbsenceRepository";

// --- CASO DE USO ---
import { ProcessAttendanceScan } from "../../application/use-cases/ProcessAttendance";
import { useAuth } from "../context/AuthContext";

type ScanStatus = "idle" | "loading" | "success" | "duplicate" | "error";

/** How long a scan result stays on screen before the terminal resets. */
const FEEDBACK_MS = 8500;

/**
 * The entry WAS recorded in every one of these cases. The wording has to say
 * so first, then name what administration needs to fix.
 */
function anomalyMessage(anomaly: ScheduleAnomaly): string {
  switch (anomaly.code) {
    case "REST_DAY":
      return `Se registró tu entrada, pero hoy${anomaly.detail ? ` (${anomaly.detail})` : ""} es tu día de descanso.`;
    case "NO_SHIFT_ASSIGNED":
      return "Se registró tu entrada, pero no tienes un turno asignado. Avisa a administración.";
    case "SHIFT_NOT_FOUND":
      return "Se registró tu entrada, pero tu turno ya no existe. Avisa a administración.";
    case "NO_BLOCKS_CONFIGURED":
      return "Se registró tu entrada, pero hoy no tienes horarios configurados. Avisa a administración.";
  }
}

// 🚀 Inicializamos las instancias (Limpieza Arquitectónica)
const attendanceRepo = new FirebaseAttendanceRepository();
const employeeRepo = new FirebaseEmployeeRepository();
const shiftRepo = new FirebaseShiftRepository();
const calendarRepo = new FirebaseCalendarRepository();
const absenceRepo = new FirebaseAbsenceRepository();

const processScanUseCase = new ProcessAttendanceScan(
  employeeRepo,
  attendanceRepo,
  shiftRepo,
  calendarRepo,
  absenceRepo,
);

export default function Scanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("Esperando escaneo...");
  const [scannedValue, setScannedValue] = useState("");

  const [employeeInfo, setEmployeeInfo] = useState<{
    name: string;
    time: string;
    isLate: boolean;
    type: "ENTRY" | "EXIT";
    skippedBlocks?: number;
    anomaly?: ScheduleAnomaly;
  } | null>(null);

  const [duplicateInfo, setDuplicateInfo] = useState<{
    name: string;
    lastCheckIn: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * A ref, not state: `status` only updates on the next render, so a reader
   * firing twice in the same tick would slip past it and run two concurrent
   * scans. This drops the second submit synchronously.
   */
  const isProcessingRef = useRef(false);

  const { logout } = useAuth();

  /**
   * Only one reset may ever be pending. Without this, two scans in a row arm
   * two timers and the first one blanks the second scan's confirmation — which
   * at 8.5s with a queue at the terminal would happen constantly.
   */
  const scheduleReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
      setMessage("Esperando escaneo...");
      setEmployeeInfo(null);
      setDuplicateInfo(null);
    }, FEEDBACK_MS);
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

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
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setStatus("loading");
    setMessage("Verificando identidad...");

    const badgeId = scannedValue.trim();
    setScannedValue("");

    try {
      // 🌟 LLAMADA AL CASO DE USO LIMPIO
      const result = await processScanUseCase.execute(badgeId);

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
        skippedBlocks: result.skippedBlocks,
        anomaly: result.anomaly,
      });

      scheduleReset();
    } catch (error) {
      console.error(error);

      // A duplicate swipe is not a failure: the person IS clocked in. Showing
      // red here would send someone to administration over nothing.
      if (isScanRejectedError(error) && error.code === "DUPLICATE_SWIPE") {
        setStatus("duplicate");
        setMessage("Tu asistencia ya está registrada");
        setEmployeeInfo(null);
        setDuplicateInfo({
          name: String(error.context?.employeeName ?? ""),
          lastCheckIn: String(error.context?.lastCheckIn ?? "--:--"),
        });
        scheduleReset();
        return;
      }

      setStatus("error");
      setMessage(
        (error instanceof Error ? error.message : String(error)) ||
          "Error al registrar la asistencia.",
      );

      // The success path used to clear employeeInfo here and the error path
      // did not, leaving stale data behind; scheduleReset clears both.
      setEmployeeInfo(null);
      setDuplicateInfo(null);
      scheduleReset();
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Full class strings, never built by interpolation — Tailwind only ships
  // classes it can see literally in the source.
  const ACCENTS = {
    idle: {
      bg: "bg-slate-50",
      icon: "bg-white text-slate-400 shadow-sm",
      text: "text-slate-700",
    },
    loading: {
      bg: "bg-blue-50",
      icon: "bg-blue-100 text-blue-600 animate-pulse",
      text: "text-blue-700",
    },
    entry: {
      bg: "bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-600",
      text: "text-emerald-700",
    },
    exit: {
      bg: "bg-indigo-50",
      icon: "bg-indigo-100 text-indigo-600",
      text: "text-indigo-700",
    },
    duplicate: {
      bg: "bg-sky-50",
      icon: "bg-sky-100 text-sky-600",
      text: "text-sky-700",
    },
    error: {
      bg: "bg-rose-50",
      icon: "bg-rose-100 text-rose-600",
      text: "text-rose-700",
    },
  } as const;

  const accent =
    status === "idle"
      ? ACCENTS.idle
      : status === "loading"
        ? ACCENTS.loading
        : status === "duplicate"
          ? ACCENTS.duplicate
          : status === "error"
            ? ACCENTS.error
            : employeeInfo?.type === "EXIT"
              ? ACCENTS.exit
              : ACCENTS.entry;

  const showsDetail = status === "success" || status === "duplicate";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 selection:bg-transparent">
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

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-500">
        <div
          className={`p-8 text-center transition-colors duration-500 flex flex-col items-center justify-center min-h-55 ${accent.bg}`}
        >
          <div
            className={`p-4 rounded-full mb-4 transition-transform duration-500 ${status !== "idle" ? "scale-110" : ""} ${accent.icon}`}
          >
            {status === "idle" && <QrCode size={48} strokeWidth={1.5} />}
            {status === "loading" && <Clock size={48} strokeWidth={1.5} />}
            {status === "success" && employeeInfo?.type === "ENTRY" && (
              <LogIn size={48} strokeWidth={1.5} />
            )}
            {status === "success" && employeeInfo?.type === "EXIT" && (
              <LogOut size={48} strokeWidth={1.5} />
            )}
            {status === "duplicate" && <Info size={48} strokeWidth={1.5} />}
            {status === "error" && <XCircle size={48} strokeWidth={1.5} />}
          </div>

          <h2
            className={`text-2xl font-bold tracking-tight ${accent.text}`}
          >
            {message}
          </h2>

          {status === "idle" && (
            <p className="text-slate-400 mt-2 text-sm font-medium">
              Acerca tu Gafete al lector
            </p>
          )}
        </div>

        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${showsDetail ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {status === "duplicate" && duplicateInfo && (
            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">
                    {duplicateInfo.name}
                  </p>
                  <p className="text-slate-500 text-sm flex items-center gap-1.5">
                    <Clock size={14} />
                    Entrada de las {duplicateInfo.lastCheckIn}, confirmada
                  </p>
                </div>
              </div>

              <div className="bg-sky-50 text-sky-800 px-4 py-2.5 rounded-lg text-sm border border-sky-200/60">
                Pasar el gafete otra vez <strong>no marca salida</strong>.
                Vuelve a pasarlo al terminar tu turno.
              </div>
            </div>
          )}

          {status === "success" && employeeInfo && (
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
              {employeeInfo.skippedBlocks !== undefined &&
              employeeInfo.skippedBlocks > 0 ? (
                <div className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded-lg text-sm font-semibold border border-rose-200 flex items-center gap-2 mt-2">
                  <XCircle size={16} /> Falta registrada en{" "}
                  {employeeInfo.skippedBlocks} bloque(s) anterior(es).
                </div>
              ) : null}
              {employeeInfo.anomaly && (
                <div className="bg-amber-50 text-amber-800 px-4 py-2.5 rounded-lg text-sm border border-amber-200/60 flex items-start gap-2 mt-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{anomalyMessage(employeeInfo.anomaly)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-slate-400 text-sm font-medium uppercase tracking-widest">
        Sistema de Control de Asistencia
      </div>
      <button
        onClick={logout}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 transition-colors"
        title="Cerrar sesión de terminal"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}
