import { useState, useEffect } from "react";
import { LogIn, LogOut, ShieldCheck, Clock, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { useAuth } from "../context/AuthContext";

export default function TeacherQRCard() {
  const { user, loading } = useAuth();

  const [scanType, setScanType] = useState<"ENTRY" | "EXIT">("ENTRY");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-sm font-medium text-slate-500">
          Generando tu código seguro...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-500 font-medium">
        Por favor, inicia sesión para ver tu código QR.
      </div>
    );
  }

  // 3. PAYLOAD DINÁMICO
  const qrPayload = JSON.stringify({
    uid: user.id,
    emp: user.employeeNumber || "0000",
    type: scanType,
    date: currentTime.toLocaleDateString("en-CA"),
  });

  return (
    // Quitamos el min-h-screen y el bg-slate-50 para que herede el layout principal sin hacer doble scroll
    <div className="flex items-center justify-center p-2 sm:p-4 font-sans text-slate-800 h-full min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* HEADER DEL PERFIL */}
        <div className="bg-slate-900 px-6 pt-8 pb-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-700 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600 rounded-full opacity-20 blur-2xl"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
              {user.fullName}
            </h2>
            <p className="text-slate-400 text-sm font-light mt-0.5">
              {user.email}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-full backdrop-blur-md shadow-inner">
              <Clock
                size={16}
                className={
                  scanType === "ENTRY" ? "text-emerald-400" : "text-indigo-400"
                }
              />
              <span className="text-white font-mono text-sm tracking-widest font-medium">
                {currentTime.toLocaleTimeString("en-US", {
                  hour12: true,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="p-6 sm:p-8 flex flex-col items-center flex-1 bg-slate-50/50">
          {/* EL CÓDIGO QR - AHORA CON ALTO CONTRASTE */}
          <div className="flex justify-center mb-6 w-full">
            <div
              className={`p-4 sm:p-5 rounded-3xl border-4 bg-white transition-all duration-300 shadow-xl ${
                scanType === "ENTRY"
                  ? "border-emerald-400 shadow-emerald-500/20"
                  : "border-indigo-400 shadow-indigo-500/20"
              }`}
            >
              {/* Le dimos un ancho máximo responsivo para que no se desborde en pantallas diminutas */}
              <div className="w-full max-w-62.5 aspect-square bg-white">
                <QRCode
                  value={qrPayload}
                  size={250}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* ESTADO DEL CÓDIGO */}
          <div className="flex flex-col items-center justify-center space-y-3 mb-8">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal border transition-colors ${
                scanType === "ENTRY"
                  ? "text-emerald-700 bg-emerald-100/50 border-emerald-200"
                  : "text-indigo-700 bg-indigo-100/50 border-indigo-200"
              }`}
            >
              <ShieldCheck size={16} />
              {scanType === "ENTRY" ? "CÓDIGO DE ENTRADA" : "CÓDIGO DE SALIDA"}
            </div>
          </div>

          {/* TOGGLE SWITCH - MOVIDO AL FONDO (ZONA DEL PULGAR) */}
          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl w-full relative mt-auto shadow-inner">
            <button
              onClick={() => setScanType("ENTRY")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all z-10 ${
                scanType === "ENTRY"
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogIn size={18} /> Entrada
            </button>
            <button
              onClick={() => setScanType("EXIT")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all z-10 ${
                scanType === "EXIT"
                  ? "text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogOut size={18} /> Salida
            </button>
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200 transition-transform duration-300 ease-spring ${
                scanType === "ENTRY" ? "translate-x-0" : "translate-x-full"
              }`}
            ></div>
          </div>
        </div>
        {import.meta.env.DEV && (
              <pre className="mt-4 text-[10px] bg-slate-100 p-2 w-full overflow-x-auto text-slate-500 rounded border border-slate-200">
                Payload: {qrPayload}
              </pre>
            )}
      </div>
    </div>
  );
}
