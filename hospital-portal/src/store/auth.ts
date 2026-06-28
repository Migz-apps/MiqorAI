import { create } from "zustand";
import { MESSAGES } from "@/lib/user-messages";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import { ApiError, getMe, loadTokens, loginApi, logoutApi, saveTokens, type MeResponse } from "@/lib/api/client";

type Session = {
  staffId: string;
  name: string;
  role: Role;
  hospitalCode: string;
  hospitalName: string;
  loggedInAt: number;
};

type AuthState = {
  session: Session | null;
  failedAttempts: number;
  lockoutUntil: number | null;
  login: (hospitalCode: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  switchRole: (role: Role) => void;
};

const AUTH_STORAGE_KEY = "MiqorAI-hospital-auth-v2";
const LEGACY_AUTH_STORAGE_KEYS = ["MiqorAI-auth"];

function mapRole(me: MeResponse): Role {
  if (me.role === "hospital_admin" || me.staff_role === "admin") return "admin";
  const r = me.staff_role as Role | undefined;
  if (isRole(r)) return r;
  return "doctor";
}

function isRole(role: unknown): role is Role {
  return typeof role === "string" && ["receptionist", "nurse", "doctor", "dept_head", "admin"].includes(role);
}

function clearLegacyAuthStorage() {
  if (typeof window === "undefined") return;
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

function sessionFromMe(me: MeResponse, hospitalCode: string): Session {
  return {
    staffId: me.id,
    name: me.display_name ?? me.email.split("@")[0],
    role: mapRole(me),
    hospitalCode: me.hospital_code ?? hospitalCode,
    hospitalName: me.hospital_name ?? hospitalCode,
    loggedInAt: Date.now(),
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      failedAttempts: 0,
      lockoutUntil: null,
      login: async (hospitalCode, email, password) => {
        try {
          const me = await loginApi(email.trim(), password, hospitalCode.trim());
          const session = sessionFromMe(me, hospitalCode.trim());
          clearLegacyAuthStorage();
          set({ failedAttempts: 0, lockoutUntil: null, session });
          return { ok: true };
        } catch (err) {
          const body = err instanceof ApiError ? (err.body as { error?: { details?: { retry_after?: number } } }) : null;
          if (err instanceof ApiError && err.status === 401 && body?.error?.details?.retry_after) {
            const retry = body.error.details.retry_after;
            set({ lockoutUntil: Date.now() + retry * 1000, failedAttempts: 5 });
            return { ok: false, error: MESSAGES.auth.tooManyAttempts };
          }
          set({ session: null, failedAttempts: 0, lockoutUntil: null });
          return { ok: false, error: err instanceof ApiError ? err.message : MESSAGES.auth.invalidCredentials };
        }
      },
      logout: async () => {
        await logoutApi();
        set({ session: null, failedAttempts: 0, lockoutUntil: null });
      },
      restoreSession: async () => {
        if (!loadTokens()) return;
        try {
          const me = await getMe();
          const prev = get().session;
          set({
            session: sessionFromMe(me, prev?.hospitalCode ?? me.hospital_code ?? ""),
          });
        } catch {
          saveTokens(null);
          set({ session: null, failedAttempts: 0, lockoutUntil: null });
        }
      },
      switchRole: (role) => {
        const s = get().session;
        if (!s) return;
        set({ session: { ...s, role } });
      },
    }),
    { name: AUTH_STORAGE_KEY, partialize: (s) => ({ session: s.session, failedAttempts: s.failedAttempts, lockoutUntil: s.lockoutUntil }),
      onRehydrateStorage: () => (state) => {
        clearLegacyAuthStorage();
        if (state && (typeof window !== "undefined" && !loadTokens() || !isRole(state.session?.role))) {
          state.session = null;
          state.failedAttempts = 0;
          state.lockoutUntil = null;
        }
      },
    },
  ),
);

export const PERMISSIONS = {
  receptionist: { scan: true,  viewBasic: true, checkIn: true, recordVitals: false, viewFull: false, addDiagnosis: false, prescribe: false, orderLabs: false, manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: true, printSticker: true },
  nurse:        { scan: true,  viewBasic: true, checkIn: false, recordVitals: true,  viewFull: true,  addDiagnosis: false, prescribe: false, orderLabs: true,  manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  doctor:       { scan: true,  viewBasic: true, checkIn: false, recordVitals: true,  viewFull: true,  addDiagnosis: true,  prescribe: true,  orderLabs: true,  manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  dept_head:    { scan: true,  viewBasic: true, checkIn: false, recordVitals: true,  viewFull: true,  addDiagnosis: true,  prescribe: true,  orderLabs: true,  manageStaff: true,  manageDepartment: true,  viewAnalytics: true,  viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  admin:        { scan: false, viewBasic: true, checkIn: false,recordVitals: false, viewFull: false, addDiagnosis: false, prescribe: false, orderLabs: false, manageStaff: true,  manageDepartment: true,  viewAnalytics: true,  viewBilling: true,  viewAudit: true,  manageDepartments: true,  manageHospital: true,  manualRegister: false, printSticker: false },
} as const;

export type PermKey = keyof typeof PERMISSIONS["admin"];
export const can = (role: Role, perm: PermKey) => PERMISSIONS[role]?.[perm] ?? false;

export const ROLE_LABEL: Record<Role, string> = {
  receptionist: "Receptionist",
  nurse: "Nurse",
  doctor: "Doctor",
  dept_head: "Department Head",
  admin: "Hospital Admin",
};

export type RoleTrack = "reception" | "clinical" | "admin";
export const ROLE_TRACK: Record<Role, RoleTrack> = {
  receptionist: "reception",
  nurse: "clinical",
  doctor: "clinical",
  dept_head: "clinical",
  admin: "admin",
};
