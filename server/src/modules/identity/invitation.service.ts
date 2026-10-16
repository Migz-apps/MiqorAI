import { HospitalStaffRole, InsurerStaffRole, PharmacyStaffRole, UserRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { hashPassword, hashToken } from "../../shared/utils/crypto.js";
import { AppError, badRequest, conflict } from "../../shared/utils/errors.js";
import { buildPortalUrl } from "../../shared/services/portal-url.service.js";

type OrganizationType = "hospital" | "pharmacy" | "insurer" | "none";

interface InvitationTarget {
  organizationType: OrganizationType;
  organizationId: string | null;
  organizationName: string | null;
}

/** Resolves the polymorphic Invitation.organizationId into its organization. */
async function resolveInvitationTarget(organizationId: string | null): Promise<InvitationTarget> {
  if (!organizationId) {
    return { organizationType: "none", organizationId: null, organizationName: null };
  }
  const hospital = await prisma.hospital.findUnique({ where: { id: organizationId } });
  if (hospital) return { organizationType: "hospital", organizationId, organizationName: hospital.name };
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: organizationId } });
  if (pharmacy) return { organizationType: "pharmacy", organizationId, organizationName: pharmacy.name };
  const insurer = await prisma.insurer.findUnique({ where: { id: organizationId } });
  if (insurer) return { organizationType: "insurer", organizationId, organizationName: insurer.name };
  throw new AppError("INVITATION_NOT_FOUND", "Invitation organization no longer exists", 404);
}

/** Maps the stored invitation role (a staff role, or a top-level role from the
 * admin invite flow) to the user role plus the organization staff role. */
function mapInvitedRole(
  organizationType: OrganizationType,
  invitedRole: string,
): { role: UserRole; staffRole: string | null } {
  if (organizationType === "hospital") {
    if ((Object.values(HospitalStaffRole) as string[]).includes(invitedRole)) {
      return {
        role: invitedRole === HospitalStaffRole.admin ? UserRole.hospital_admin : UserRole.hospital_staff,
        staffRole: invitedRole,
      };
    }
    if (invitedRole === UserRole.hospital_admin) {
      return { role: UserRole.hospital_admin, staffRole: HospitalStaffRole.admin };
    }
  } else if (organizationType === "pharmacy") {
    if ((Object.values(PharmacyStaffRole) as string[]).includes(invitedRole)) {
      return {
        role: invitedRole === PharmacyStaffRole.manager ? UserRole.pharmacy_manager : UserRole.pharmacy_staff,
        staffRole: invitedRole,
      };
    }
    if (invitedRole === UserRole.pharmacy_manager) {
      return { role: UserRole.pharmacy_manager, staffRole: PharmacyStaffRole.manager };
    }
  } else if (organizationType === "insurer") {
    if ((Object.values(InsurerStaffRole) as string[]).includes(invitedRole)) {
      return {
        role: invitedRole === InsurerStaffRole.admin ? UserRole.insurer_admin : UserRole.insurer_analyst,
        staffRole: invitedRole,
      };
    }
    if (invitedRole === UserRole.insurer_admin) {
      return { role: UserRole.insurer_admin, staffRole: InsurerStaffRole.admin };
    }
    if (invitedRole === UserRole.insurer_analyst) {
      return { role: UserRole.insurer_analyst, staffRole: InsurerStaffRole.analyst };
    }
  } else if ((Object.values(UserRole) as string[]).includes(invitedRole)) {
    return { role: invitedRole as UserRole, staffRole: null };
  }
  throw badRequest(`Invitation role "${invitedRole}" cannot be accepted for this organization`);
}

async function loadPendingInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invitation) throw new AppError("INVITATION_NOT_FOUND", "Invitation not found", 404);
  if (invitation.acceptedAt) {
    throw new AppError("INVITATION_ALREADY_ACCEPTED", "Invitation has already been accepted", 404);
  }
  if (invitation.expiresAt.getTime() <= Date.now()) {
    throw new AppError("INVITATION_EXPIRED", "Invitation has expired", 404);
  }
  return invitation;
}

export async function getInvitationInfo(token: string) {
  const invitation = await loadPendingInvitation(token);
  const target = await resolveInvitationTarget(invitation.organizationId);
  const mapped = mapInvitedRole(target.organizationType, invitation.role);
  return {
    email: invitation.email,
    role: mapped.role,
    staff_role: mapped.staffRole,
    organization_name: target.organizationName,
    organization_type: target.organizationType,
  };
}

export async function acceptInvitation(token: string, input: { name: string; password: string }) {
  const invitation = await loadPendingInvitation(token);
  const target = await resolveInvitationTarget(invitation.organizationId);
  const mapped = mapInvitedRole(target.organizationType, invitation.role);

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) throw conflict("A user with this email already exists");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invitation.email,
        passwordHash: hashPassword(input.password),
        role: mapped.role,
        displayName: input.name,
        organizationId: target.organizationId,
        organizationType: target.organizationType,
        isActive: true,
      },
    });

    if (target.organizationId && mapped.staffRole) {
      if (target.organizationType === "hospital") {
        await tx.hospitalStaff.create({
          data: {
            hospitalId: target.organizationId,
            userId: user.id,
            role: mapped.staffRole as HospitalStaffRole,
          },
        });
      } else if (target.organizationType === "pharmacy") {
        await tx.pharmacyStaff.create({
          data: {
            pharmacyId: target.organizationId,
            userId: user.id,
            role: mapped.staffRole as PharmacyStaffRole,
          },
        });
      } else if (target.organizationType === "insurer") {
        await tx.insurerStaff.create({
          data: {
            insurerId: target.organizationId,
            userId: user.id,
            role: mapped.staffRole as InsurerStaffRole,
          },
        });
      }
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedUserId: user.id },
    });
  });

  return { ok: true };
}

/** Invite links land on the inviting organization's own portal. */
export async function buildInvitationUrl(organizationId: string | null | undefined, token: string) {
  const path = `/accept-invite?invite_token=${token}`;
  if (!organizationId) return buildPortalUrl("admin", path);
  const target = await resolveInvitationTarget(organizationId);
  if (target.organizationType === "hospital") return buildPortalUrl("hospital", path);
  if (target.organizationType === "pharmacy") return buildPortalUrl("pharmacy", path);
  return buildPortalUrl("insurance", path);
}
