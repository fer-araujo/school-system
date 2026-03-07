import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FirebaseAuthRepository } from "../../infrastructure/repositories/FirebaseAuthRepository";
import type { User } from "../../domain/models/User";
import { auth } from "../../infrastructure/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const authRepo = new FirebaseAuthRepository();

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ya sabemos que la sesión existe en Firebase, ahora traemos tus datos (rol, nombre, etc)
        try {
          const u = await authRepo.getCurrentUser();
          setUser(u);
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          setUser(null);
        }
      } else {
        // Definitivamente no hay sesión activa
        setUser(null);
      }

      // Bajamos la bandera de loading HASTA QUE Firebase nos dio una respuesta definitiva
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedUser = await authRepo.login(email, pass);
    setUser(loggedUser);
  };

  const logout = async () => {
    await authRepo.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
