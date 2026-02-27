import { useState, useRef, useEffect } from "react";
import { ProcessQRScan } from "../../application/use-cases/ProcessQRScan";
import { FirebaseAttendanceRepository } from "../../infrastructure/repositories/FirebaseAttendanceRepository";
import { QrCode } from "lucide-react";
import { FirebaseCalendarRepository } from "../../infrastructure/repositories/FirebaseCalendarRepository";
import { FirebaseShiftRepository } from "../../infrastructure/repositories/FirebaseShiftRepository";
import { FirebaseAbsenceRepository } from "../../infrastructure/repositories/FirebaseAbsenceRepository";

// Instanciamos nuestro caso de uso
const attendanceRepo = new FirebaseAttendanceRepository();
const calendarRepo = new FirebaseCalendarRepository();
const absenceRepo = new FirebaseAbsenceRepository();
const shiftRepo = new FirebaseShiftRepository();

const processScanUseCase = new ProcessQRScan(
  attendanceRepo,
  calendarRepo,
  absenceRepo,
  shiftRepo,
);

export default function Scanner() {
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantenemos el input siempre enfocado para que la pistola no escriba "en el aire"
  useEffect(() => {
    inputRef.current?.focus();
  }, [message]);

  const handleBlur = () => {
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página recargue al presionar "Enter" (lo cual hace la pistola sola)

    const qrText = inputValue.trim();
    if (!qrText) return;

    setInputValue(""); // Limpiamos rapidísimo para el siguiente maestro
    setMessage({ text: "Procesando...", type: "info" });

    try {
      const successMsg = await processScanUseCase.execute(qrText);
      setMessage({ text: successMsg, type: "success" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setMessage({ text: errorMessage, type: "error" });
    } finally {
      // Borrar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Control de Acceso</h1>

      <div
        className="bg-white border-2 border-slate-300 p-8 rounded-lg flex flex-col items-center cursor-pointer shadow-sm hover:border-school-primary transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        <QrCode className="w-20 h-20 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium mb-6 text-center">
          El sistema está listo.
          <br />
          Pase el código QR por el lector.
        </p>

        {/* El formulario que atrapa los escaneos de la pistola */}
        <form onSubmit={handleSubmit} className="w-full">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            className="w-full opacity-10 h-1" // Casi invisible
            placeholder="Esperando lectura..."
            autoComplete="off"
          />
        </form>

        {/* Mensajes de feedback (Verde = bien, Rojo = error) */}
        <div className="h-16 w-full mt-4 flex items-center justify-center">
          {message && (
            <div
              className={`w-full p-3 rounded font-bold text-center text-white shadow-sm ${
                message.type === "success"
                  ? "bg-green-500"
                  : message.type === "error"
                    ? "bg-red-500"
                    : "bg-blue-500"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
