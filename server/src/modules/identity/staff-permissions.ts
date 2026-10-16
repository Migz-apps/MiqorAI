import type { NextFunction, Request, Response } from "express";
import type { HospitalStaffRole, InsurerStaffRole, PharmacyStaffRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { forbidden, unauthorized } from "../../shared/utils/errors.js";

/**
 * Single source of truth for staff sub-role authorization. The same matrices
 * drive the permission lists returned by /auth/me (session.service.ts) and the
 * per-route enforcement middleware below, so display and enforcement cannot
 * drift. "*" grants every permission. Top-level organization admins
 * (hospital_admin, pharmacy_manager, insurer_admin) and super_admin bypass
 * staff-role checks entirely.
 */

export type HospitalPermission =
  | "patients"
  | "checkin"
  | "registration"
  | "clinical_records"
  | "vitals"
  | "diagnosis"
  | "prescriptions"
  | "labs"
  | "referrals"
  | "visits"
  | "staff"
  | "reports"
  | "departments"
  | "settings";

export const HOSPITAL_STAFF_PERMISSIONS: Record<
  HospitalStaffRole,
  readonly (HospitalPermission | "*")[]
> = {
  admin: ["*"],
  receptionist: ["patients", "checkin", "registration"],
  nurse: ["patients", "checkin", "registration", "clinical_records", "vitals", "labs"],
  doctor: [
    "patients",
    "checkin",
    "registration",
    "clinical_records",
    "vitals",
    "diagnosis",
    "prescriptions",
    "labs",
    "referrals",
    "visits",
  ],
  dept_head: [
    "patients",
    "checkin",
    "registration",
    "clinical_records",
    "vitals",
    "diagnosis",
    "prescriptions",
    "labs",
    "referrals",
    "visits",
    "staff",
    "reports",
    "departments",
  ],
};

export type PharmacyPermission =
  | "sales"
  | "prepare"
  | "dispense"
  | "inventory"
  | "reports"
  | "audit"
  | "staff"
  | "settings";

export const PHARMACY_STAFF_PERMISSIONS: Record<
  PharmacyStaffRole,
  readonly (PharmacyPermission | "*")[]
> = {
  manager: ["*"],
  pharmacist: ["sales", "prepare", "dispense", "inventory", "reports", "audit"],
  technician: ["sales", "prepare", "inventory"],
  cashier: ["sales"],
};

export type InsurerPermission =
  | "analytics"
  | "members"
  | "reports"
  | "fraud"
  | "contracts"
  | "billing"
  | "audit"
  | "staff"
  | "api_keys"
  | "settings";

export const INSURER_STAFF_PERMISSIONS: Record<
  InsurerStaffRole,
  readonly (InsurerPermission | "*")[]
> = {
  admin: ["*"],
  executive: ["analytics", "members", "reports", "fraud", "contracts", "billing", "audit"],
  contracts_manager: ["analytics", "members", "reports", "contracts", "billing"],
  fraud_investigator: ["analytics", "members", "reports", "fraud", "audit"],
  analyst: ["analytics", "members", "reports"],
};

export function hospitalStaffPermissions(role: HospitalStaffRole): string[] {
  return [...(HOSPITAL_STAFF_PERMISSIONS[role] ?? [])];
}

export function pharmacyStaffPermissions(role: PharmacyStaffRole): string[] {
  return [...(PHARMACY_STAFF_PERMISSIONS[role] ?? [])];
}

export function insurerStaffPermissions(role: InsurerStaffRole): string[] {
  return [...(INSURER_STAFF_PERMISSIONS[role] ?? [])];
}

function includesPermission(perms: readonly string[], permission: string): boolean {
  return perms.includes("*") || perms.includes(permission);
}

/** Staff sub-role gate for hospital routes. hospital_admin and super_admin bypass. */
export function requireHospitalPermission(permission: HospitalPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw unauthorized();
      if (user.role === "hospital_admin" || user.role === "super_admin") return next();
      const staff = await prisma.hospitalStaff.findUnique({ where: { userId: user.sub } });
      if (!staff?.isActive) throw forbidden("Hospital staff record required");
      if (!includesPermission(HOSPITAL_STAFF_PERMISSIONS[staff.role] ?? [], permission)) {
        throw forbidden(`Staff role '${staff.role}' is not permitted to perform '${permission}' actions`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Staff sub-role gate for pharmacy routes. pharmacy_manager and super_admin bypass. */
export function requirePharmacyPermission(permission: PharmacyPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw unauthorized();
      if (user.role === "pharmacy_manager" || user.role === "super_admin") return next();
      const staff = await prisma.pharmacyStaff.findUnique({ where: { userId: user.sub } });
      if (!staff?.isActive) throw forbidden("Pharmacy staff record required");
      if (!includesPermission(PHARMACY_STAFF_PERMISSIONS[staff.role] ?? [], permission)) {
        throw forbidden(`Staff role '${staff.role}' is not permitted to perform '${permission}' actions`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Staff sub-role gate for insurer routes. insurer_admin and super_admin bypass.
 * An insurer_analyst without a staff record is treated as the least-privileged
 * analyst role rather than rejected, since the top-level role already implies it. */
export function requireInsurerPermission(permission: InsurerPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw unauthorized();
      if (user.role === "insurer_admin" || user.role === "super_admin") return next();
      const staff = await prisma.insurerStaff.findUnique({ where: { userId: user.sub } });
      if (staff && !staff.isActive) throw forbidden("Insurer staff record inactive");
      const role: InsurerStaffRole = staff?.role ?? "analyst";
      if (!includesPermission(INSURER_STAFF_PERMISSIONS[role] ?? [], permission)) {
        throw forbidden(`Staff role '${role}' is not permitted to perform '${permission}' actions`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
