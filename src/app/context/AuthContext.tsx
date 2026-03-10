import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FirebaseAuthRepository } from "../../infrastructure/repositories/FirebaseAuthRepository";
import type { User } from "../../domain/models/User";
import { auth } from "../../infrastructure/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // 🌟 Cambiamos Promise<void> por Promise<User | null> para que el Login reciba el rol
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🌟 Instanciamos el repositorio con el nombre correcto
const authRepo = new FirebaseAuthRepository();

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const u = await authRepo.getCurrentUser();
          setUser(u);
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<User | null> => {
    // 🌟 El repositorio de Auth ya debe encargarse de devolver al User (con su rol)
    const userData = await authRepo.login(email, password);
    setUser(userData);
    return userData;
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
