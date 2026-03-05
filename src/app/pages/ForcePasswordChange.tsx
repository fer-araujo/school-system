import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { ShieldAlert, KeyRound, Loader2, LogOut } from "lucide-react";
import { CompleteOnboarding } from "../../application/use-cases/CompleteOnboarding";
// Instanciamos el caso de uso
const completeOnboardingUseCase = new CompleteOnboarding();

export default function ForcePasswordChange() {
  const { user, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (!user) {
      toast.error("Sesión no válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Delegamos la lógica pesada al caso de uso
      await completeOnboardingUseCase.execute(user.id, newPassword);

      toast.success("¡Contraseña actualizada con éxito!");

      // Recargamos para que el router principal vuelva a evaluar el estado del usuario
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-50 p-8 border-b border-slate-100 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200/50">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Acceso Restringido
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Por tu seguridad, debes cambiar la contraseña temporal asignada por
            el administrador antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Vuelve a escribirla"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || newPassword.length < 6}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:hover:bg-blue-600 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Actualizar y Entrar"
            )}
          </button>
        </form>

        <div className="px-8 pb-8 text-center">
          <button
            onClick={logout}
            type="button"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-rose-500 font-medium transition-colors"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
