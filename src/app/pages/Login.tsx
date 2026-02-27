import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { School, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      // Si el login es exitoso, el AuthContext actualizará el estado
      // y App.tsx nos redirigirá automáticamente.
    } catch (err: unknown) {
      console.error("ERROR DE FIREBASE:", err); // <-- Añadimos esto
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("User not found in database")) {
        setError(
          "El usuario existe, pero no tiene perfil en la base de datos.",
        );
      } else {
        setError(`Error: ${errorMessage}`); // Mostramos el error real en la UI temporalmente
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-school-primary/10 p-3 rounded-full mb-4">
            <School className="w-8 h-8 text-school-primary" />
          </div>
          <h1 className="text-2xl font-bold text-school-secondary">
            Acceso al Sistema
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-school-primary focus:border-school-primary outline-none transition-all"
              placeholder="admin@escuela.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-school-primary focus:border-school-primary outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-school-primary hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 mt-6 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
