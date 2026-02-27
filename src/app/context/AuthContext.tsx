import { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseAuthRepository } from '../../domain/repositories/FirebaseAuthRepository';
import type { User } from '../../domain/models/User';

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
    // Verificar si hay sesión activa al cargar
    authRepo.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
    });
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};