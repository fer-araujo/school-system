import { useState, useEffect } from "react";
import { LogIn, LogOut, ShieldCheck, Clock, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { useAuth } from "../context/AuthContext";

export default function TeacherQRCard() {
  // 1. ADIÓS FIREBASE: Consumimos tu contexto existente
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-sm font-medium text-slate-500">
          Generando tu código seguro...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Por favor, inicia sesión para ver tu código QR.
      </div>
    );
  }

  // 3. PAYLOAD DINÁMICO (Mapeado directo de tu modelo User)
  const qrPayload = JSON.stringify({
    uid: user.id, // Tu modelo User seguro tiene 'id'
    emp: user.employeeNumber || "0000",
    type: scanType,
    date: currentTime.toLocaleDateString("en-CA"),
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800 selection:bg-transparent">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* HEADER DEL PERFIL */}
        <div className="bg-slate-800 px-6 pt-8 pb-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-700 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600 rounded-full opacity-20 blur-2xl"></div>

          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {user.fullName}
            </h2>
            <p className="text-slate-400 text-sm font-light mt-0.5">
              {user.email}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 bg-slate-900/50 border border-slate-700/50 px-4 py-1.5 rounded-full backdrop-blur-sm">
              <Clock size={14} className="text-blue-400" />
              <span className="text-blue-100 font-mono text-sm tracking-widest">
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
        <div className="p-6">
          {/* TOGGLE SWITCH ENTRADA / SALIDA */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8 relative">
            <button
              onClick={() => setScanType("ENTRY")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${
                scanType === "ENTRY"
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogIn size={16} /> Entrada
            </button>
            <button
              onClick={() => setScanType("EXIT")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${
                scanType === "EXIT"
                  ? "text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LogOut size={16} /> Salida
            </button>
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm border border-slate-200/50 transition-transform duration-300 ease-in-out ${
                scanType === "ENTRY" ? "translate-x-0" : "translate-x-full"
              }`}
            ></div>
          </div>

          {/* EL CÓDIGO QR */}
          <div className="flex justify-center mb-6">
            <div
              className={`p-4 rounded-2xl border-2 transition-colors duration-300 ${scanType === "ENTRY" ? "border-emerald-100 bg-emerald-50/30" : "border-indigo-100 bg-indigo-50/30"}`}
            >
              <QRCode value={qrPayload} size={220} level="H" />
            </div>
          </div>

          {/* ESTADO DEL CÓDIGO */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
              <ShieldCheck size={14} /> Código Dinámico Seguro
            </div>
            {import.meta.env.DEV && (
              <pre className="mt-4 text-[10px] bg-slate-100 p-2 w-full overflow-x-auto text-slate-500 rounded border border-slate-200">
                Payload: {qrPayload}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
