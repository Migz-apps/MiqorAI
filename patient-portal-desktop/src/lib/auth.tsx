import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { mockUser } from "./mockData";

type User = typeof mockUser;
type AuthCtx = {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  signup: (data: { name: string; email: string; phone: string; password: string }) => boolean;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "medportal:auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    }
  };

  const login = (email: string, password: string) => {
    if (!email || !password) return false;
    persist({ ...mockUser, email });
    return true;
  };

  const signup = (data: { name: string; email: string; phone: string; password: string }) => {
    if (!data.name || !data.email || !data.password) return false;
    persist({ ...mockUser, name: data.name, email: data.email, phone: data.phone });
    return true;
  };

  const logout = () => persist(null);
  const updateUser = (patch: Partial<User>) => user && persist({ ...user, ...patch });

  return (
    <Ctx.Provider value={{ user, isLoggedIn: !!user, login, signup, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
