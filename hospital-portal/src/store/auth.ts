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

function mapRole(me: MeResponse): Role {
  if (me.role === "hospital_admin" || me.staff_role === "admin") return "admin";
  const r = me.staff_role as Role | undefined;
  if (r && ["receptionist", "nurse", "doctor", "dept_head", "admin"].includes(r)) return r;
  return "doctor";
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
        const now = Date.now();
        if (get().lockoutUntil && get().lockoutUntil! > now) {
          const mins = Math.ceil((get().lockoutUntil! - now) / 60000);
          return { ok: false, error: MESSAGES.auth.locked(mins) };
        }
        try {
          const me = await loginApi(email.trim(), password, hospitalCode.trim());
          const session = sessionFromMe(me, hospitalCode.trim());
          set({ failedAttempts: 0, lockoutUntil: null, session });
          return { ok: true };
        } catch (err) {
          const body = err instanceof ApiError ? (err.body as { error?: { details?: { retry_after?: number } } }) : null;
          if (err instanceof ApiError && err.status === 401 && body?.error?.details?.retry_after) {
            const retry = body.error.details.retry_after;
            set({ lockoutUntil: now + retry * 1000, failedAttempts: 5 });
            return { ok: false, error: MESSAGES.auth.tooManyAttempts };
          }
          const attempts = get().failedAttempts + 1;
          set({
            failedAttempts: attempts,
            lockoutUntil: attempts >= 5 ? now + 15 * 60 * 1000 : null,
          });
          if (attempts >= 5) return { ok: false, error: MESSAGES.auth.tooManyAttempts };
          return { ok: false, error: MESSAGES.auth.attemptsRemaining(5 - attempts) };
        }
      },
      logout: async () => {
        await logoutApi();
        set({ session: null });
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
          set({ session: null });
        }
      },
      switchRole: (role) => {
        const s = get().session;
        if (!s) return;
        set({ session: { ...s, role } });
      },
    }),
    { name: "MiqorAI-auth", partialize: (s) => ({ session: s.session, failedAttempts: s.failedAttempts, lockoutUntil: s.lockoutUntil }) },
  ),
);

export const PERMISSIONS = {
  receptionist: { scan: true,  viewBasic: true, checkIn: true, recordVitals: false, viewFull: false, addDiagnosis: false, prescribe: false, orderLabs: false, manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: true, printSticker: true },
  nurse:        { scan: true,  viewBasic: true, checkIn: true, recordVitals: true,  viewFull: true,  addDiagnosis: false, prescribe: false, orderLabs: true,  manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  doctor:       { scan: true,  viewBasic: true, checkIn: true, recordVitals: true,  viewFull: true,  addDiagnosis: true,  prescribe: true,  orderLabs: true,  manageStaff: false, manageDepartment: false, viewAnalytics: false, viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  dept_head:    { scan: true,  viewBasic: true, checkIn: true, recordVitals: true,  viewFull: true,  addDiagnosis: true,  prescribe: true,  orderLabs: true,  manageStaff: true,  manageDepartment: true,  viewAnalytics: true,  viewBilling: false, viewAudit: false, manageDepartments: false, manageHospital: false, manualRegister: false, printSticker: false },
  admin:        { scan: false, viewBasic: true, checkIn: false,recordVitals: false, viewFull: false, addDiagnosis: false, prescribe: false, orderLabs: false, manageStaff: true,  manageDepartment: true,  viewAnalytics: true,  viewBilling: true,  viewAudit: true,  manageDepartments: true,  manageHospital: true,  manualRegister: false, printSticker: false },
} as const;

export type PermKey = keyof typeof PERMISSIONS["admin"];
export const can = (role: Role, perm: PermKey) => PERMISSIONS[role][perm];

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
