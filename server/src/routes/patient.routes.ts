import { RecordType, UserRole, AccessScope } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { saveExportFile } from "../services/file.service.js";
import { getPatientQrImage, touchPatientData } from "../services/qr.service.js";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  getFamilyMemberProfile,
  getOrCreateRecoveryPhrase,
  getPatientHealthInsights,
  listEmergencyContacts,
  requestDataDeletion,
  updateEmergencyContact,
} from "../services/patient-ext.service.js";
import {
  createAccessGrantWithScope,
  createFamilyDependent,
  getDeletionRequestStatus,
  getDependentDashboard,
  getPatientSettings,
  listEnrichedAccessGrants,
  searchGranteeProviders,
  updatePatientPrefs,
} from "../services/portal-complete.service.js";
import { badRequest, notFound } from "../utils/errors.js";
import { param } from "../utils/param.js";
import {
  approveQrAccessRequest,
  denyQrAccessRequest,
  listPendingQrAccessRequestsForPatient,
} from "../services/qr-access-request.service.js";

const router = Router();

router.use(authenticate, requireRoles("patient"));

async function requirePatient(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { user: { select: { email: true, phone: true, twoFactorEnabled: true } } },
  });
  if (!patient || !patient.isActive) throw notFound("Patient not found");
  return patient;
}

const profileUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  national_id: z.string().optional(),
  insurance_id: z.string().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const recordCreateSchema = z.object({
  record_type: z.nativeEnum(RecordType),
  data: z.record(z.unknown()),
});

const recordUpdateSchema = z.object({
  data: z.record(z.unknown()),
});

const accessGrantSchema = z.object({
  grantee_type: z.enum(["hospital", "pharmacy", "doctor"]),
  grantee_id: z.string().uuid(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.nativeEnum(AccessScope).optional(),
});

const familySchema = z.object({
  dependent_phone: z.string().min(8),
  relationship: z.enum(["child", "parent", "spouse", "sibling", "other"]),
  access_level: z.enum(["full", "caregiver_only", "read_only"]),
});

const familyDependentSchema = z.object({
  name: z.string().min(2),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  relationship: z.enum(["child", "parent", "spouse", "sibling", "other"]),
  access_level: z.enum(["full", "caregiver_only", "read_only"]),
});

const settingsSchema = z.object({
  biometric_enabled: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  notifications: z.record(z.unknown()).optional(),
  language: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

router.get("/profile", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json({
      id: patient.id,
      user_id: patient.userId,
      first_name: patient.firstName,
      last_name: patient.lastName,
      national_id: patient.nationalId,
      insurance_id: patient.insuranceId,
      date_of_birth: patient.dateOfBirth.toISOString().slice(0, 10),
      emergency_contact_name: patient.emergencyContactName,
      emergency_contact_phone: patient.emergencyContactPhone,
      email: patient.user.email,
      phone: patient.user.phone,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/profile", validateBody(profileUpdateSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const body = req.body;

    if (body.email || body.phone) {
      await prisma.user.update({
        where: { id: patient.userId },
        data: {
          ...(body.email ? { email: body.email.toLowerCase() } : {}),
          ...(body.phone ? { phone: body.phone } : {}),
        },
      });
    }

    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...(body.first_name ? { firstName: body.first_name } : {}),
        ...(body.last_name ? { lastName: body.last_name } : {}),
        ...(body.national_id !== undefined ? { nationalId: body.national_id } : {}),
        ...(body.insurance_id !== undefined ? { insuranceId: body.insurance_id } : {}),
        ...(body.date_of_birth ? { dateOfBirth: new Date(body.date_of_birth) } : {}),
        ...(body.emergency_contact_name !== undefined
          ? { emergencyContactName: body.emergency_contact_name }
          : {}),
        ...(body.emergency_contact_phone !== undefined
          ? { emergencyContactPhone: body.emergency_contact_phone }
          : {}),
      },
      include: { user: { select: { email: true, phone: true } } },
    });

    await touchPatientData(patient.id);

    res.json({
      id: updated.id,
      first_name: updated.firstName,
      last_name: updated.lastName,
      national_id: updated.nationalId,
      insurance_id: updated.insuranceId,
      date_of_birth: updated.dateOfBirth.toISOString().slice(0, 10),
      emergency_contact_name: updated.emergencyContactName,
      emergency_contact_phone: updated.emergencyContactPhone,
      email: updated.user.email,
      phone: updated.user.phone,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/qr-code", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const qr = await getPatientQrImage(patient.id);
    res.json(qr);
  } catch (err) {
    next(err);
  }
});

router.get("/records", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const type = req.query.type as RecordType | undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const where = {
      patientId: patient.id,
      isActive: true,
      ...(type ? { recordType: type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.post("/records", validateBody(recordCreateSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        recordType: req.body.record_type,
        data: req.body.data,
        recordedBy: req.user!.sub,
      },
    });
    await touchPatientData(patient.id);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.get("/records/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const record = await prisma.medicalRecord.findFirst({
      where: { id: param(req.params.id), patientId: patient.id, isActive: true },
    });
    if (!record) throw notFound("Record not found");
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.put("/records/:id", validateBody(recordUpdateSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const existing = await prisma.medicalRecord.findFirst({
      where: { id: param(req.params.id), patientId: patient.id, isActive: true },
    });
    if (!existing) throw notFound("Record not found");

    const record = await prisma.medicalRecord.update({
      where: { id: existing.id },
      data: { data: req.body.data },
    });
    await touchPatientData(patient.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete("/records/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const existing = await prisma.medicalRecord.findFirst({
      where: { id: param(req.params.id), patientId: patient.id, isActive: true },
    });
    if (!existing) throw notFound("Record not found");

    await prisma.medicalRecord.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    await touchPatientData(patient.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/visits", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const visits = await prisma.visit.findMany({
      where: { patientId: patient.id },
      orderBy: { checkedInAt: "desc" },
      include: { hospital: { select: { id: true, name: true, city: true } } },
    });
    res.json(visits);
  } catch (err) {
    next(err);
  }
});

router.get("/prescriptions", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      orderBy: { prescribedAt: "desc" },
      include: {
        items: true,
        hospital: { select: { id: true, name: true } },
        pharmacy: { select: { id: true, name: true } },
      },
    });
    res.json(prescriptions);
  } catch (err) {
    next(err);
  }
});

router.get("/labs", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const labs = await prisma.labOrder.findMany({
      where: { patientId: patient.id },
      orderBy: { orderedAt: "desc" },
      include: { hospital: { select: { id: true, name: true } } },
    });
    res.json(labs);
  } catch (err) {
    next(err);
  }
});

router.get("/allergies", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const allergies = await prisma.medicalRecord.findMany({
      where: { patientId: patient.id, recordType: "allergy", isActive: true },
      orderBy: { recordedAt: "desc" },
    });
    res.json(allergies);
  } catch (err) {
    next(err);
  }
});

router.get("/access-grants", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await listEnrichedAccessGrants(patient.id));
  } catch (err) {
    next(err);
  }
});

router.get("/providers/search", async (req, res, next) => {
  try {
    res.json(await searchGranteeProviders(String(req.query.q ?? "")));
  } catch (err) {
    next(err);
  }
});

router.post("/access-grants", validateBody(accessGrantSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const grant = await createAccessGrantWithScope(patient.id, req.user!.sub, req.body);
    res.status(201).json(grant);
  } catch (err) {
    next(err);
  }
});

router.get("/access-requests", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const requests = await listPendingQrAccessRequestsForPatient(patient.id);
    res.json(
      requests.map((request) => ({
        id: request.id,
        hospital_name: request.hospitalName,
        hospital_code: request.hospitalCode,
        requester_name: request.requesterName,
        requester_email: request.requesterEmail,
        status: request.status,
        created_at: request.createdAt,
        expires_at: request.expiresAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/access-requests/:id/approve", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const { request, grant } = await approveQrAccessRequest(param(req.params.id), patient.id, req.user!.sub);
    res.json({
      id: request.id,
      status: request.status,
      grant_id: grant.id,
      expires_at: grant.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/access-requests/:id/deny", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const request = await denyQrAccessRequest(param(req.params.id), patient.id);
    res.json({
      id: request.id,
      status: request.status,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/access-grants/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const grant = await prisma.accessGrant.findFirst({
      where: { id: param(req.params.id), patientId: patient.id, isActive: true },
    });
    if (!grant) throw notFound("Access grant not found");

    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/access-logs", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const [items, total] = await Promise.all([
      prisma.accessLog.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          accessor: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.accessLog.count({ where: { patientId: patient.id } }),
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

router.get("/family", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const members = await prisma.familyMember.findMany({
      where: { primaryPatientId: patient.id, isActive: true },
      include: {
        dependentPatient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            user: { select: { phone: true, email: true } },
          },
        },
      },
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post("/family", validateBody(familySchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const dependentUser = await prisma.user.findFirst({
      where: { phone: req.body.dependent_phone, role: UserRole.patient },
      include: { patient: true },
    });
    if (!dependentUser?.patient) throw badRequest("Dependent patient not found");

    const member = await prisma.familyMember.create({
      data: {
        primaryPatientId: patient.id,
        dependentPatientId: dependentUser.patient.id,
        relationship: req.body.relationship,
        accessLevel: req.body.access_level,
      },
      include: {
        dependentPatient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.delete("/family/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const member = await prisma.familyMember.findFirst({
      where: { id: param(req.params.id), primaryPatientId: patient.id, isActive: true },
    });
    if (!member) throw notFound("Family member not found");

    await prisma.familyMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);

    const [totalVisits, activePrescriptions, allergiesCount, recentLogs, upcomingAppointments] =
      await Promise.all([
      prisma.visit.count({ where: { patientId: patient.id } }),
      prisma.prescription.count({
        where: {
          patientId: patient.id,
          status: { in: ["pending", "verified", "ready", "sent_to_pharmacy"] },
        },
      }),
      prisma.medicalRecord.count({
        where: { patientId: patient.id, recordType: "allergy", isActive: true },
      }),
      prisma.accessLog.findMany({
        where: { patientId: patient.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { accessor: { select: { email: true, role: true } } },
      }),
      prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: "scheduled",
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: { hospital: { select: { name: true, city: true } } },
      }),
    ]);

    res.json({
      upcoming_appointments: upcomingAppointments.map((a) => ({
        id: a.id,
        scheduled_at: a.scheduledAt,
        department: a.department,
        provider: a.provider,
        hospital: a.hospital?.name,
        city: a.hospital?.city,
        status: a.status,
      })),
      recent_activity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        accessor: log.accessor.email,
        role: log.accessor.role,
        at: log.createdAt,
      })),
      health_insights: await getPatientHealthInsights(patient.id),
      quick_stats: {
        total_visits: totalVisits,
        active_prescriptions: activePrescriptions,
        allergies_count: allergiesCount,
        conditions_count: await prisma.medicalRecord.count({
          where: { patientId: patient.id, recordType: "diagnosis", isActive: true },
        }),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    await requirePatient(req.user!.sub);
    res.json(await getPatientSettings(req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.put("/settings", validateBody(settingsSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    const body = req.body;

    if (body.language !== undefined || body.theme !== undefined) {
      await updatePatientPrefs(req.user!.sub, { language: body.language, theme: body.theme });
    }

    if (body.biometric_enabled !== undefined) {
      await prisma.platformSetting.upsert({
        where: { key: `patient_biometric:${patient.userId}` },
        create: { key: `patient_biometric:${patient.userId}`, value: { enabled: body.biometric_enabled } },
        update: { value: { enabled: body.biometric_enabled } },
      });
    }

    if (body.two_factor_enabled !== undefined) {
      await prisma.user.update({
        where: { id: patient.userId },
        data: { twoFactorEnabled: body.two_factor_enabled },
      });
    }

    if (body.notifications) {
      await prisma.platformSetting.upsert({
        where: { key: `patient_notifications:${patient.userId}` },
        create: { key: `patient_notifications:${patient.userId}`, value: body.notifications },
        update: { value: body.notifications },
      });
    }

    const notifications = body.notifications
      ? body.notifications
      : (
          await prisma.platformSetting.findUnique({
            where: { key: `patient_notifications:${patient.userId}` },
          })
        )?.value ?? {};

    const biometricRow = await prisma.platformSetting.findUnique({
      where: { key: `patient_biometric:${patient.userId}` },
    });
    const biometricEnabled =
      body.biometric_enabled ??
      ((biometricRow?.value as { enabled?: boolean } | null)?.enabled ?? false);

    res.json({
      ...(await getPatientSettings(req.user!.sub)),
      biometric_enabled: biometricEnabled,
      two_factor_enabled: body.two_factor_enabled ?? patient.user.twoFactorEnabled,
      notifications,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/export-data", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);

    const [records, visits, prescriptions, labs, grants, family] = await Promise.all([
      prisma.medicalRecord.findMany({ where: { patientId: patient.id, isActive: true } }),
      prisma.visit.findMany({ where: { patientId: patient.id } }),
      prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: { items: true },
      }),
      prisma.labOrder.findMany({ where: { patientId: patient.id } }),
      prisma.accessGrant.findMany({ where: { patientId: patient.id } }),
      prisma.familyMember.findMany({ where: { primaryPatientId: patient.id, isActive: true } }),
    ]);

    const exportPayload = {
      exported_at: new Date().toISOString(),
      patient: {
        id: patient.id,
        first_name: patient.firstName,
        last_name: patient.lastName,
        date_of_birth: patient.dateOfBirth,
        national_id: patient.nationalId,
        insurance_id: patient.insuranceId,
      },
      records,
      visits,
      prescriptions,
      labs,
      access_grants: grants,
      family,
    };

    const downloadUrl = await saveExportFile(
      patient.userId,
      `patient-export-${patient.id}.json`,
      JSON.stringify(exportPayload, null, 2),
      "application/json",
    );

    res.json({ download_url: downloadUrl });
  } catch (err) {
    next(err);
  }
});

router.delete("/account", validateBody(deleteAccountSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);

    await prisma.$transaction([
      prisma.patient.update({ where: { id: patient.id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: patient.userId }, data: { isActive: false } }),
      prisma.accessGrant.updateMany({
        where: { patientId: patient.id },
        data: { isActive: false },
      }),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/health-insights", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await getPatientHealthInsights(patient.id));
  } catch (err) {
    next(err);
  }
});

router.get("/recovery-phrase", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await getOrCreateRecoveryPhrase(patient.id));
  } catch (err) {
    next(err);
  }
});

router.get("/emergency-contacts", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await listEmergencyContacts(patient.id));
  } catch (err) {
    next(err);
  }
});

router.post("/emergency-contacts", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.status(201).json(await createEmergencyContact(patient.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.put("/emergency-contacts/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await updateEmergencyContact(patient.id, param(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.delete("/emergency-contacts/:id", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    await deleteEmergencyContact(patient.id, param(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/deletion-request", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.status(201).json(await requestDataDeletion(patient.id, req.body?.reason));
  } catch (err) {
    next(err);
  }
});

router.get("/deletion-request", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await getDeletionRequestStatus(patient.id));
  } catch (err) {
    next(err);
  }
});

router.post("/family/dependents", validateBody(familyDependentSchema), async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.status(201).json(await createFamilyDependent(patient.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/family/:id/profile", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await getFamilyMemberProfile(patient.id, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/family/:id/dashboard", async (req, res, next) => {
  try {
    const patient = await requirePatient(req.user!.sub);
    res.json(await getDependentDashboard(patient.id, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

export default router;
