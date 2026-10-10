import { HospitalStaffRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";

export async function getEnhancedCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      hospitalStaff: { include: { hospital: true } },
      pharmacyStaff: { include: { pharmacy: true } },
      insurerStaff: { include: { insurer: true } },
      patient: true,
    },
  });
  if (!user) return null;

  const base = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    display_name: user.displayName,
    organization_id: user.organizationId,
    organization_type: user.organizationType ?? "none",
    is_active: user.isActive,
    last_login_at: user.lastLoginAt,
  };

  if (user.hospitalStaff) {
    return {
      ...base,
      staff_role: user.hospitalStaff.role,
      department: user.hospitalStaff.department,
      hospital_name: user.hospitalStaff.hospital.name,
      hospital_code: user.hospitalStaff.hospital.code,
      permissions: staffPermissions(user.hospitalStaff.role),
    };
  }
  if (user.pharmacyStaff) {
    return {
      ...base,
      staff_role: user.pharmacyStaff.role,
      pharmacy_name: user.pharmacyStaff.pharmacy.name,
      pharmacy_code: user.pharmacyStaff.pharmacy.code,
    };
  }
  if (user.insurerStaff) {
    return {
      ...base,
      staff_role: user.insurerStaff.role,
      insurer_name: user.insurerStaff.insurer.name,
      insurer_code: user.insurerStaff.insurer.code,
    };
  }
  return base;
}

function staffPermissions(role: HospitalStaffRole): string[] {
  const map: Record<HospitalStaffRole, string[]> = {
    admin: ["*"],
    doctor: ["patients", "prescriptions", "labs", "referrals"],
    nurse: ["patients", "vitals", "labs"],
    receptionist: ["checkin", "registration", "patients"],
    dept_head: ["patients", "staff", "reports", "departments"],
  };
  return map[role] ?? [];
}
