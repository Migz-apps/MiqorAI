import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  ApiError,
  completePatientSignupApi,
  loadTokens,
  loginApi,
  logoutApi,
  requestForgotPasswordApi,
  resendForgotPasswordOtpApi,
  resetPasswordApi,
  saveTokens,
  verifyForgotPasswordOtpApi,
} from "./api/client";
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
  signup: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    dateOfBirth: string;
  }) => Promise<{ verificationRequired: boolean; email: string } | null>;
  verifySignupOtp: (email: string, otp: string) => Promise<boolean>;
  resendSignupOtp: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resendPasswordResetOtp: (email: string) => Promise<boolean>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<string | null>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
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

  const signup = async (data: { name: string; email: string; phone: string; password: string; dateOfBirth: string }) => {
    if (!data.name.trim() || !data.email.includes("@") || !data.phone.trim() || !data.password || !data.dateOfBirth) {
      return null;
    }
    try {
      await patientApi.register({
        phone: data.phone.trim(),
        password: data.password,
        full_name: data.name.trim(),
        date_of_birth: data.dateOfBirth,
        email: data.email.trim(),
      });
      return { verificationRequired: true, email: data.email.trim().toLowerCase() };
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) return null;
      return null;
    }
  };

  const verifySignupOtp = async (email: string, otp: string) => {
    try {
      await completePatientSignupApi(email.trim(), otp.trim());
      const profile = await patientApi.profile();
      persist(toUser(profile));
      return true;
    } catch {
      saveTokens(null);
      return false;
    }
  };

  const resendSignupOtp = async (email: string) => {
    try {
      await patientApi.resendRegistrationOtp(email.trim());
      return true;
    } catch {
      return false;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await requestForgotPasswordApi(email.trim());
      return true;
    } catch {
      return false;
    }
  };

  const resendPasswordResetOtp = async (email: string) => {
    try {
      await resendForgotPasswordOtpApi(email.trim());
      return true;
    } catch {
      return false;
    }
  };

  const verifyPasswordResetOtp = async (email: string, otp: string) => {
    try {
      const result = await verifyForgotPasswordOtpApi(email.trim(), otp.trim());
      return result.reset_token;
    } catch {
      return null;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      await resetPasswordApi(token, newPassword);
      return true;
    } catch {
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
    <Ctx.Provider
      value={{
        user,
        isLoggedIn: !!user,
        authReady,
        login,
        signup,
        verifySignupOtp,
        resendSignupOtp,
        requestPasswordReset,
        resendPasswordResetOtp,
        verifyPasswordResetOtp,
        resetPassword,
        logout,
        updateUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
