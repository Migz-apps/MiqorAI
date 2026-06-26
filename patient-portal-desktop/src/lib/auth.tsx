import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ApiError, loadTokens, loginApi, logoutApi, saveTokens } from "./api/client";
import { patientApi, profileToUser, type ProfileResponse } from "./api/patient";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  nationalId: string;
  insuranceId: string;
};

type AuthCtx = {
  user: User | null;
  isLoggedIn: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; phone: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const KEY = "miqorai-patient-auth";

function toUser(p: ProfileResponse): User {
  return profileToUser(p);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        if (loadTokens()) {
          const profile = await patientApi.profile();
          persist(toUser(profile));
        } else {
          localStorage.removeItem(KEY);
          setUser(null);
        }
      } catch {
        saveTokens(null);
        localStorage.removeItem(KEY);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    if (!email.includes("@") || !password) return false;
    try {
      await loginApi(email.trim(), password);
      const profile = await patientApi.profile();
      persist(toUser(profile));
      return true;
    } catch {
      saveTokens(null);
      return false;
    }
  };

  const signup = async (data: { name: string; email: string; phone: string; password: string }) => {
    if (!data.name.trim() || !data.email.includes("@") || !data.password) return false;
    try {
      await patientApi.register({
        phone: data.phone.trim() || "+254700000000",
        password: data.password,
        full_name: data.name.trim(),
        date_of_birth: "1990-01-01",
        email: data.email.trim(),
      });
      return login(data.email, data.password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) return false;
      return false;
    }
  };

  const logout = async () => {
    await logoutApi();
    persist(null);
  };

  const updateUser = async (patch: Partial<User>) => {
    if (!user) return;
    const body: Record<string, unknown> = {};
    if (patch.name) {
      const parts = patch.name.trim().split(/\s+/);
      body.first_name = parts[0];
      body.last_name = parts.slice(1).join(" ") || parts[0];
    }
    if (patch.dob) body.date_of_birth = patch.dob;
    if (patch.phone !== undefined) body.phone = patch.phone;
    if (patch.email !== undefined) body.email = patch.email;
    if (patch.nationalId !== undefined) body.national_id = patch.nationalId;
    if (patch.insuranceId !== undefined) body.insurance_id = patch.insuranceId;
    const updated = await patientApi.updateProfile(body);
    persist(toUser(updated));
  };

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
