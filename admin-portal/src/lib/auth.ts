import { create } from "zustand";
import { MESSAGES } from "./user-messages";
import { persist } from "zustand/middleware";
import {
  ApiError,
  clearSession,
  getMe,
  loginApi,
  logoutApi,
  onSessionExpired,
  restoreSession as restoreApiSession,
} from "./api/client";

type Session = {
  email: string;
  loggedInAt: number;
};

type AuthState = {
  session: Session | null;
  /** False until the cookie-based session restore on page load has settled. */
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

/** Only platform super admins may use this portal. */
export function isPortalRole(role: string | undefined): boolean {
  return role === "super_admin";
}

let restoreInFlight: Promise<void> | null = null;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      ready: false,
      login: async (email, password) => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail.includes("@") || password.length < 4) {
          return { ok: false, error: MESSAGES.auth.invalidCredentials };
        }
        try {
          const me = await loginApi(trimmedEmail, password);
          if (!isPortalRole(me.role)) {
            // End the server session too, so the refresh cookie cannot restore it.
            await logoutApi();
            return { ok: false, error: MESSAGES.auth.invalidCredentials };
          }
          set({ session: { email: me.email, loggedInAt: Date.now() }, ready: true });
          return { ok: true };
        } catch (err) {
          const msg =
            err instanceof ApiError && err.status === 401
              ? MESSAGES.auth.invalidCredentials
              : MESSAGES.auth.invalidCredentials;
          return { ok: false, error: msg };
        }
      },
      logout: async () => {
        await logoutApi();
        set({ session: null });
      },
      restoreSession: () => {
        // One restore per page load; every page shell shares it.
        if (get().ready) return Promise.resolve();
        if (!restoreInFlight) {
          restoreInFlight = (async () => {
            try {
              if (!(await restoreApiSession())) {
                set({ session: null, ready: true });
                return;
              }
              const me = await getMe();
              if (!isPortalRole(me.role)) throw new Error("not admin");
              set({ session: { email: me.email, loggedInAt: Date.now() }, ready: true });
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
    { name: "MiqorAI-admin-auth", partialize: (s) => ({ session: s.session }) },
  ),
);

// A refresh that fails mid-session drops the session so the page shell redirects to login.
onSessionExpired(() => useAuth.setState({ session: null }));
