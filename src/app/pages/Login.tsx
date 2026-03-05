import { useState } from "react";
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Estados para los inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para los errores (Global e Inline)
  const [globalError, setGlobalError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Limpiamos errores previos
    setGlobalError("");
    setEmailError("");
    setPasswordError("");

    let isValid = true;

    // 2. Validaciones Inline Customizadas
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex básico para correos

    if (!email.trim()) {
      setEmailError("El correo electrónico es requerido.");
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError(
        "Ingresa un formato de correo válido (ej. usuario@akar.com).",
      );
      isValid = false;
    }

    if (!password) {
      setPasswordError("La contraseña es requerida.");
      isValid = false;
    }

    if (!isValid) return;

    // 3. Ejecución del Login
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (error: unknown) {
      // 4. Traductor de Errores de Firebase a mensajes amigables
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("auth/invalid-credential") ||
          errorMessage.includes("auth/user-not-found") ||
          errorMessage.includes("auth/wrong-password")
        ) {
          setGlobalError(
            "Correo o contraseña incorrectos. Por favor, verifica tus datos.",
          );
        } else if (errorMessage.includes("auth/too-many-requests")) {
          setGlobalError(
            "Demasiados intentos fallidos. Por seguridad, intenta más tarde.",
          );
        } else if (errorMessage.includes("auth/network-request-failed")) {
          setGlobalError(
            "Error de conexión. Revisa tu internet e intenta de nuevo.",
          );
        } else {
          setGlobalError(
            "Ocurrió un error al intentar acceder. Contacta a soporte técnico.",
          );
        }
      } else {
        setGlobalError("Error desconocido. Verifica tu conexión.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white selection:bg-blue-100 selection:text-blue-900">
      {/* 🟢 PANEL IZQUIERDO: Visual / Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-[-20%] left-[-10%] w-150 h-150 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-20%] w-150 h-150 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

        {/* Header: Logo restaurado */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            School<span className="text-blue-500">System</span>
          </span>
        </div>

        {/* Mensaje Principal */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white tracking-tighter leading-tight mb-6">
            Bienvenido al portal digital de{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">
              Centro educativo AKAR.
            </span>
          </h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            Tu plataforma de acceso rápido para gestionar tu día a día,
            consultar tu información de manera segura y apoyarte en tus labores
            de forma sencilla.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-slate-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} Centro educativo AKAR. Portal
            Institucional.
          </p>
        </div>
      </div>

      {/* 🟢 PANEL DERECHO: Formulario de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative bg-slate-50">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-slate-500 font-medium">
              Ingresa tus credenciales para acceder a tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Mensaje de Error Global */}
            {globalError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3.5 rounded-xl flex items-start gap-3 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="font-medium">{globalError}</p>
              </div>
            )}

            {/* Input Correo */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${emailError ? "text-rose-400" : "text-slate-400 group-focus-within:text-blue-600"}`}
                >
                  <Mail className="w-5 h-5 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-sm ${
                    emailError
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20 hover:border-slate-300"
                  }`}
                  placeholder="ejemplo@escuela.com"
                  disabled={isLoading}
                />
              </div>
              {emailError && (
                <p className="text-xs font-semibold text-rose-500 ml-1 animate-in slide-in-from-top-1">
                  {emailError}
                </p>
              )}
            </div>

            {/* Input Contraseña */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${passwordError ? "text-rose-400" : "text-slate-400 group-focus-within:text-blue-600"}`}
                >
                  <Lock className="w-5 h-5 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-sm ${
                    passwordError
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-slate-200 focus:border-blue-600 focus:ring-blue-500/20 hover:border-slate-300"
                  }`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
              {passwordError && (
                <p className="text-xs font-semibold text-rose-500 ml-1 animate-in slide-in-from-top-1">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Accediendo...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al portal</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
