import { HospitalStaffRole, UserRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { hashPassword } from "../../shared/utils/crypto.js";
import { badRequest } from "../../shared/utils/errors.js";

export async function publicHospitalStaffSignup(input: {
  email: string;
  password: string;
  hospital_code: string;
  role: HospitalStaffRole;
  department?: string;
  full_name?: string;
}) {
  const hospital = await prisma.hospital.findFirst({ where: { code: input.hospital_code, isActive: true } });
  if (!hospital) throw badRequest("Invalid hospital code");
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw badRequest("Email already registered");

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: UserRole.hospital_staff,
      organizationId: hospital.id,
      organizationType: "hospital",
      displayName: input.full_name,
      isActive: false,
    },
  });
  await prisma.hospitalStaff.create({
    data: {
      hospitalId: hospital.id,
      userId: user.id,
      role: input.role,
      department: input.department,
      isActive: false,
    },
  });
  return { user_id: user.id, status: "pending_approval" };
}
