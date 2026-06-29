import { create } from "zustand";
import { MESSAGES } from "./user-messages";
import { persist } from "zustand/middleware";
import { ApiError, getMe, loadTokens, loginApi, logoutApi, saveTokens } from "./api/client";

type Session = {
  email: string;
  loggedInAt: number;
};

type AuthState = {
  session: Session | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      login: async (email, password) => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail.includes("@") || password.length < 4) {
          return { ok: false, error: MESSAGES.auth.invalidCredentials };
        }
        try {
          const me = await loginApi(trimmedEmail, password);
          if (me.role !== "super_admin") {
            saveTokens(null);
            return { ok: false, error: MESSAGES.auth.invalidCredentials };
          }
          set({ session: { email: me.email, loggedInAt: Date.now() } });
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
      restoreSession: async () => {
        if (!loadTokens()) return;
        try {
          const me = await getMe();
          if (me.role !== "super_admin") throw new Error("not admin");
          set({ session: { email: me.email, loggedInAt: Date.now() } });
        } catch {
          saveTokens(null);
          set({ session: null });
        }
      },
    }),
    { name: "MiqorAI-admin-auth" },
  ),
);
