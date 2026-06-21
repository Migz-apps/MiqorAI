import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { mockUser } from "./mockData";

type User = typeof mockUser;
type AuthCtx = {
  user: User | null;
  isLoggedIn: boolean;
  authReady: boolean;
  login: (email: string, password: string) => boolean;
  signup: (data: { name: string; email: string; phone: string; password: string }) => boolean;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "miqorai-patient-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem("medportal:auth");
      if (raw) {
        setUser(JSON.parse(raw));
        localStorage.setItem(KEY, raw);
        localStorage.removeItem("medportal:auth");
      }
    } catch {
      localStorage.removeItem(KEY);
      localStorage.removeItem("medportal:auth");
    }
    setAuthReady(true);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else {
        localStorage.removeItem(KEY);
        localStorage.removeItem("medportal:auth");
      }
    }
  };

  const login = (email: string, password: string) => {
    if (!email.includes("@") || !password) return false;
    persist({ ...mockUser, email: email.trim() });
    return true;
  };

  const signup = (data: { name: string; email: string; phone: string; password: string }) => {
    if (!data.name.trim() || !data.email.includes("@") || !data.password) return false;
    persist({
      ...mockUser,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
    });
    return true;
  };

  const logout = () => persist(null);
  const updateUser = (patch: Partial<User>) => user && persist({ ...user, ...patch });

  return (
    <Ctx.Provider value={{ user, isLoggedIn: !!user, authReady, login, signup, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
