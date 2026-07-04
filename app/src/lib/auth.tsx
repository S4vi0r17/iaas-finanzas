import type { UserProfile } from "@iaas/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, setApiToken, setUnauthorizedHandler } from "./api";

const TOKEN_KEY = "iaas_token";

type AuthResponse = { token: string; user: UserProfile };

type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura la sesión al arrancar
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        setApiToken(token);
        try {
          const { user } = await apiFetch<{ user: UserProfile }>("/api/me");
          setUser(user);
        } catch {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setApiToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function persist({ token, user }: AuthResponse) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setApiToken(token);
    setUser(user);
  }

  async function login(email: string, password: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await persist(res);
  }

  async function register(email: string, password: string, name: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { email, password, name },
    });
    await persist(res);
  }

  async function logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setApiToken(null);
    setUser(null);
  }

  // Cualquier 401 del backend (token inválido, o sesión de un usuario que ya
  // no existe en la DB, p. ej. tras un reset en un redeploy) fuerza logout en
  // vez de dejar al usuario atascado viendo un error genérico en cada acción.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
