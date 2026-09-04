import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Shown to an authenticated user whose role has no portal in this app.
 * It must always offer a way out, otherwise the user is stranded on a dead
 * screen while holding a live session.
 */
export default function Unauthorized() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-[20px] border border-slate-200 shadow-xs p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <ShieldAlert className="text-amber-500" size={26} />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-slate-800">
          Acceso no disponible
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Tu cuenta no tiene acceso a este portal. Si crees que se trata de un
          error, contacta a administración.
        </p>

        {user?.email && (
          <p className="mt-4 text-xs text-slate-400">
            Sesión iniciada como{" "}
            <span className="font-medium text-slate-500">{user.email}</span>
          </p>
        )}

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoggingOut ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <LogOut size={16} />
          )}
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
