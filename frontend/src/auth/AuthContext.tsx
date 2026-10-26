import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../api/client";

export type UserRole = "user" | "rep" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // O cookie é httpOnly, então a única forma de saber se há sessão é perguntar
  // ao backend. 401 aqui é resposta esperada (visitante), não erro.
  const carregarSessao = useCallback(async () => {
    try {
      const { user: perfil } = await api<{ user: AuthUser }>("/auth/me");
      setUser(perfil);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        // eslint-disable-next-line no-console
        console.error("Falha ao carregar a sessão:", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarSessao();
  }, [carregarSessao]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api("/auth/login", { method: "POST", body: { email, password } });
      await carregarSessao();
    },
    [carregarSessao]
  );

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de um AuthProvider.");
  }
  return context;
}
