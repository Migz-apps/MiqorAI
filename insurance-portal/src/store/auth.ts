import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import { INSURER, STAFF, VALID_INSURER_CODES } from "@/lib/mockData";

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
  login: (insurerCode: string, email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  switchRole: (role: Role) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      failedAttempts: 0,
      lockoutUntil: null,
      login: (insurerCode, email, password) => {
        const now = Date.now();
        if (get().lockoutUntil && get().lockoutUntil! > now) {
          const mins = Math.ceil((get().lockoutUntil! - now) / 60000);
          return { ok: false, error: `Locked. Try again in ${mins} min.` };
        }
        const staff = STAFF.find(s => s.email.toLowerCase() === email.toLowerCase() && s.active);
        const codeOk = VALID_INSURER_CODES.includes(insurerCode);
        if (!codeOk || !staff || password !== "medpass") {
          const attempts = get().failedAttempts + 1;
          set({
            failedAttempts: attempts,
            lockoutUntil: attempts >= 5 ? now + 15 * 60 * 1000 : null,
          });
          if (attempts >= 5) return { ok: false, error: "Too many attempts. Locked for 15 minutes." };
          return { ok: false, error: `Invalid credentials. ${5 - attempts} attempt(s) left.` };
        }
        set({
          failedAttempts: 0, lockoutUntil: null,
          session: {
            staffId: staff.id, name: staff.name, email: staff.email, role: staff.role,
            insurerCode, insurerName: INSURER.name, loggedInAt: now,
          },
        });
        return { ok: true };
      },
      logout: () => set({ session: null }),
      switchRole: (role) => {
        const s = get().session; if (!s) return;
        set({ session: { ...s, role } });
      },
    }),
    { name: "medpass-insurer-auth" }
  )
);

// Permissions per Section 1.3
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
