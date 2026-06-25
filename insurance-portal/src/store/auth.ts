import { create } from "zustand";
import { MESSAGES } from "@/lib/user-messages";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import {
  ApiError,
  getMe,
  loadTokens,
  loginApi,
  logoutApi,
  saveTokens,
  type MeResponse,
} from "@/lib/api/client";
import { mapStaffRole } from "@/lib/api/insurer";

type Session = {
  staffId: string;
  name: string;
  email: string;
  role: Role;
  insurerCode: string;
  insurerName: string;
  loggedInAt: number;
};

type AuthState = {
  session: Session | null;
  failedAttempts: number;
  lockoutUntil: number | null;
  login: (insurerCode: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  switchRole: (role: Role) => void;
};

function mapRole(me: MeResponse): Role {
  if (me.role === "insurer_admin" || me.staff_role === "admin") return "admin";
  if (me.staff_role) return mapStaffRole(me.staff_role);
  return "analyst";
}

function sessionFromMe(me: MeResponse, insurerCode: string): Session {
  return {
    staffId: me.id,
    name: me.display_name ?? me.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email: me.email,
    role: mapRole(me),
    insurerCode: me.insurer_code ?? insurerCode,
    insurerName: me.insurer_name ?? insurerCode,
    loggedInAt: Date.now(),
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      failedAttempts: 0,
      lockoutUntil: null,
      login: async (insurerCode, email, password) => {
        const now = Date.now();
        if (get().lockoutUntil && get().lockoutUntil! > now) {
          const mins = Math.ceil((get().lockoutUntil! - now) / 60000);
          return { ok: false, error: MESSAGES.auth.locked(mins) };
        }
        try {
          const me = await loginApi(email.trim(), password, insurerCode.trim());
          set({
            failedAttempts: 0,
            lockoutUntil: null,
            session: sessionFromMe(me, insurerCode.trim()),
          });
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
            session: sessionFromMe(me, prev?.insurerCode ?? me.insurer_code ?? ""),
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
    {
      name: "MiqorAI-insurer-auth",
      partialize: (s) => ({ session: s.session, failedAttempts: s.failedAttempts, lockoutUntil: s.lockoutUntil }),
    },
  ),
);

export const PERMISSIONS = {
  analyst:   { viewDashboard: true, viewSavings: true, viewAdherence: true, viewFraud: false, runReports: true,  exportData: true,  viewContract: false, viewBilling: false, manageStaff: false, viewAudit: false, manageSettings: false },
  fraud:     { viewDashboard: true, viewSavings: true, viewAdherence: true, viewFraud: true,  runReports: true,  exportData: true,  viewContract: false, viewBilling: false, manageStaff: false, viewAudit: true,  manageSettings: false },
  contracts: { viewDashboard: true, viewSavings: true, viewAdherence: true, viewFraud: false, runReports: true,  exportData: true,  viewContract: true,  viewBilling: true,  manageStaff: false, viewAudit: false, manageSettings: false },
  executive: { viewDashboard: true, viewSavings: true, viewAdherence: true, viewFraud: true,  runReports: true,  exportData: true,  viewContract: true,  viewBilling: true,  manageStaff: false, viewAudit: true,  manageSettings: false },
  admin:     { viewDashboard: true, viewSavings: true, viewAdherence: true, viewFraud: true,  runReports: true,  exportData: true,  viewContract: true,  viewBilling: true,  manageStaff: true,  viewAudit: true,  manageSettings: true  },
} as const;

export type PermKey = keyof typeof PERMISSIONS["admin"];
export const can = (role: Role, perm: PermKey) => PERMISSIONS[role][perm];

export const ROLE_LABEL: Record<Role, string> = {
  analyst:   "Analyst",
  fraud:     "Fraud Investigator",
  contracts: "Contracts Manager",
  executive: "Executive",
  admin:     "Administrator",
};

export type RoleTrack = "analyst" | "fraud" | "contracts" | "executive" | "admin";
export const ROLE_TRACK: Record<Role, RoleTrack> = {
  analyst: "analyst", fraud: "fraud", contracts: "contracts", executive: "executive", admin: "admin",
};
