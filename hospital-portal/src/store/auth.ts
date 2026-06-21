import { create } from "zustand";
import { MESSAGES } from "@/lib/user-messages";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/types";
import { HOSPITAL, STAFF, VALID_HOSPITAL_CODES } from "@/lib/mockData";

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
  login: (hospitalCode: string, email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  switchRole: (role: Role) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      failedAttempts: 0,
      lockoutUntil: null,
      login: (hospitalCode, email, password) => {
        const now = Date.now();
        if (get().lockoutUntil && get().lockoutUntil! > now) {
          const mins = Math.ceil((get().lockoutUntil! - now) / 60000);
          return { ok: false, error: MESSAGES.auth.locked(mins) };
        }
        const staff = STAFF.find(s => s.email.toLowerCase() === email.toLowerCase() && s.active);
        const codeOk = VALID_HOSPITAL_CODES.includes(hospitalCode);
        if (!codeOk || !staff || password !== "MiqorAI") {
          const attempts = get().failedAttempts + 1;
          set({
            failedAttempts: attempts,
            lockoutUntil: attempts >= 5 ? now + 15 * 60 * 1000 : null,
          });
          if (attempts >= 5) return { ok: false, error: MESSAGES.auth.tooManyAttempts };
          return { ok: false, error: MESSAGES.auth.attemptsRemaining(5 - attempts) };
        }
        set({
          failedAttempts: 0, lockoutUntil: null,
          session: {
            staffId: staff.id, name: staff.name, role: staff.role,
            hospitalCode, hospitalName: HOSPITAL.name, loggedInAt: now,
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
    { name: "MiqorAI-auth" }
  )
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

// Each role has a visual "track" (color accent + persona)
export type RoleTrack = "reception" | "clinical" | "admin";
export const ROLE_TRACK: Record<Role, RoleTrack> = {
  receptionist: "reception",
  nurse: "clinical",
  doctor: "clinical",
  dept_head: "clinical",
  admin: "admin",
};
