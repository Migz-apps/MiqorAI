import { create } from "zustand";
import { MESSAGES } from "@/lib/user-messages";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import {
  ApiError,
  clearSession,
  getMe,
  loginApi,
  logoutApi,
  onSessionExpired,
  restoreSession as restoreApiSession,
  type MeResponse,
} from "@/lib/api/client";
import { mapStaffRole } from "@/lib/api/mappers";

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
  /** False until the cookie-based session restore on page load has settled. */
  ready: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
  login: (pharmacyCode: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

let restoreInFlight: Promise<void> | null = null;

export function mapRole(me: MeResponse): Role {
  if (me.role === "pharmacy_manager") return "manager";
  return mapStaffRole(me.staff_role);
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
      ready: false,
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
          set({ failedAttempts: 0, lockoutUntil: null, session, ready: true });
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
      restoreSession: () => {
        // One restore per page load; concurrent guards share it.
        if (get().ready) return Promise.resolve();
        if (!restoreInFlight) {
          restoreInFlight = (async () => {
            try {
              if (!(await restoreApiSession())) {
                set({ session: null, ready: true });
                return;
              }
              const me = await getMe();
              const prev = get().session;
              set({ session: sessionFromMe(me, prev?.pharmacyCode ?? me.pharmacy_code ?? ""), ready: true });
            } catch {
              clearSession();
              set({ session: null, ready: true });
            }
          })().finally(() => {
            restoreInFlight = null;
          });
        }
        return restoreInFlight;
      },
    }),
    {
      name: "MiqorAI-pharmacy-auth",
      partialize: (s) => ({ session: s.session, failedAttempts: s.failedAttempts, lockoutUntil: s.lockoutUntil }),
    },
  ),
);

// A refresh that fails mid-session drops the session so route guards redirect to login.
onSessionExpired(() => useAuth.setState({ session: null }));

export const PERMISSIONS = {
  cashier:    { scanQR: true,  viewQueue: true, viewRxDetails: false, prepare: false, verify: false, dispense: false, override: false, manageInventory: false, manageStaff: false, viewAnalytics: false, viewBilling: true,  viewAudit: false, manageSettings: false },
  technician: { scanQR: true,  viewQueue: true, viewRxDetails: true,  prepare: true,  verify: false, dispense: false, override: false, manageInventory: true,  manageStaff: false, viewAnalytics: false, viewBilling: true,  viewAudit: false, manageSettings: false },
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
