import { create } from "zustand";
import { MESSAGES } from "@/lib/user-messages";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import { ApiError, getMe, loadTokens, loginApi, logoutApi, saveTokens, type MeResponse } from "@/lib/api/client";

type Session = {
  staffId: string;
  name: string;
  role: Role;
  pharmacyCode: string;
  pharmacyName: string;
  loggedInAt: number;
};

type AuthState = {
  session: Session | null;
  failedAttempts: number;
  lockoutUntil: number | null;
  login: (pharmacyCode: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  switchRole: (role: Role) => void;
};

function mapRole(me: MeResponse): Role {
  const r = me.staff_role as Role | undefined;
  if (r && ["cashier", "technician", "pharmacist", "manager"].includes(r)) return r;
  return "pharmacist";
}

function sessionFromMe(me: MeResponse, pharmacyCode: string): Session {
  return {
    staffId: me.id,
    name: me.display_name ?? me.email.split("@")[0],
    role: mapRole(me),
    pharmacyCode: me.pharmacy_code ?? pharmacyCode,
    pharmacyName: me.pharmacy_name ?? pharmacyCode,
    loggedInAt: Date.now(),
  };
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      failedAttempts: 0,
      lockoutUntil: null,
      login: async (pharmacyCode, email, password) => {
        const now = Date.now();
        if (get().lockoutUntil && get().lockoutUntil! > now) {
          const mins = Math.ceil((get().lockoutUntil! - now) / 60000);
          return { ok: false, error: MESSAGES.auth.locked(mins) };
        }
        try {
          const me = await loginApi(email.trim(), password, pharmacyCode.trim());
          const session = sessionFromMe(me, pharmacyCode.trim());
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
            session: sessionFromMe(me, prev?.pharmacyCode ?? me.pharmacy_code ?? ""),
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
      name: "MiqorAI-pharmacy-auth",
      partialize: (s) => ({ session: s.session, failedAttempts: s.failedAttempts, lockoutUntil: s.lockoutUntil }),
    },
  ),
);

export const PERMISSIONS = {
  cashier:    { scanQR: true,  viewQueue: true, viewRxDetails: false, prepare: false, verify: false, dispense: true,  override: false, manageInventory: false, manageStaff: false, viewAnalytics: false, viewBilling: true,  viewAudit: false, manageSettings: false },
  technician: { scanQR: true,  viewQueue: true, viewRxDetails: true,  prepare: true,  verify: false, dispense: true,  override: false, manageInventory: true,  manageStaff: false, viewAnalytics: false, viewBilling: true,  viewAudit: false, manageSettings: false },
  pharmacist: { scanQR: true,  viewQueue: true, viewRxDetails: true,  prepare: true,  verify: true,  dispense: true,  override: true,  manageInventory: true,  manageStaff: false, viewAnalytics: true,  viewBilling: true,  viewAudit: true,  manageSettings: false },
  manager:    { scanQR: true,  viewQueue: true, viewRxDetails: true,  prepare: true,  verify: true,  dispense: true,  override: true,  manageInventory: true,  manageStaff: true,  viewAnalytics: true,  viewBilling: true,  viewAudit: true,  manageSettings: true  },
} as const;

export type PermKey = keyof typeof PERMISSIONS["manager"];
export const can = (role: Role, perm: PermKey) => PERMISSIONS[role][perm];

export const ROLE_LABEL: Record<Role, string> = {
  cashier: "Cashier",
  technician: "Pharmacy Technician",
  pharmacist: "Pharmacist",
  manager: "Pharmacy Manager",
};

export type RoleTrack = "cashier" | "tech" | "pharmacist" | "manager";
export const ROLE_TRACK: Record<Role, RoleTrack> = {
  cashier: "cashier",
  technician: "tech",
  pharmacist: "pharmacist",
  manager: "manager",
};
