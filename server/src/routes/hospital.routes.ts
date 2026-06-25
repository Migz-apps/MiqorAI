import {
  HospitalStaffRole,
  PrescriptionStatus,
  UserRole,
  VisitStatus,
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { assertAccessGrant, logPatientAccess } from "../services/access.service.js";
import { getPatientQrImage, touchPatientData } from "../services/qr.service.js";
import { sendInvitationEmail } from "../services/notification.service.js";
import {
  hashPassword,
  hashToken,
  randomToken,
} from "../utils/crypto.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { param } from "../utils/param.js";
import type { TokenPayload } from "../utils/crypto.js";
import { listAuditLogs } from "../services/audit.service.js";
import {
  assignVisitStaff,
  createDepartment,
  generateHospitalReport,
  getExtendedHospitalAnalytics,
  getHospitalBilling,
  getPatientAiSummary,
  listDepartments,
  listHospitalLabs,
  listHospitalNotifications,
  listHospitalPrescriptions,
  listHospitalReports,
  markNotificationRead,
  updateDepartment,
  updateVisitPriority,
} from "../services/hospital-ext.service.js";
import { getHospitalSettings, updateHospitalSettings } from "../services/insurer-ext.service.js";
import { hospitalStaffSignup } from "../services/staff.service.js";
import { getSystemHealth } from "../services/admin.service.js";
import {
  checkPrescriptionAllergies,
  completeVisitCheckout,
  createHospitalNotification,
  createReferralWithIcd,
  deleteDepartment,
  exportHospitalAuditCsv,
  getHospitalDashboardKpis,
  getHospitalInvoicePdf,
  getHospitalPatientQr,
  getLabTrends,
  getPatientCensus,
  listHospitalStaffEnriched,
  listReportSchedules,
  createReportSchedule,
  markAllNotificationsRead,
} from "../services/portal-complete.service.js";

const router = Router();

const hospitalRoles = ["hospital_admin", "hospital_staff", "super_admin"] as const;

router.post("/staff/signup", async (req, res, next) => {
  try {
    res.status(201).json(await hospitalStaffSignup(req.body));
  } catch (err) {
    next(err);
  }
});

router.use(authenticate, requireRoles(...hospitalRoles));

async function requireHospitalContext(user: TokenPayload) {
  if (user.role === "super_admin" && user.organizationId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: user.organizationId } });
    if (hospital) return { hospitalId: hospital.id, userId: user.sub };
  }

  if (!user.organizationId || user.organizationType !== "hospital") {
    throw forbidden("Hospital organization required");
  }

  const staff = await prisma.hospitalStaff.findUnique({ where: { userId: user.sub } });
  if (!staff?.isActive && user.role !== "super_admin") {
    throw forbidden("Hospital staff record required");
  }

  return { hospitalId: user.organizationId, userId: user.sub, staff };
}

async function assertHospitalPatientAccess(hospitalId: string, patientId: string, accessorId: string) {
  await assertAccessGrant(patientId, "hospital", hospitalId);
  await logPatientAccess({
    patientId,
    accessorId,
    action: "view_records",
  });
}

const checkinSchema = z
  .object({
    patient_id: z.string().uuid().optional(),
    phone: z.string().optional(),
    department: z.string().min(1),
    priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  })
  .refine((d) => d.patient_id || d.phone, { message: "patient_id or phone required" });

const registerPatientSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(8),
  national_id: z.string().optional(),
  insurance_id: z.string().optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  allergies: z.array(z.object({ name: z.string(), severity: z.string().optional() })).optional(),
});

const vitalsSchema = z.object({
  bp_systolic: z.number().optional(),
  bp_diastolic: z.number().optional(),
  heart_rate: z.number().optional(),
  temperature: z.number().optional(),
  spo2: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
});

const diagnosisSchema = z.object({
  diagnosis_codes: z.array(z.string()).default([]),
  chief_complaint: z.string().optional(),
  notes: z.string().optional(),
});

const prescriptionItemSchema = z.object({
  drug_name: z.string().min(1),
  generic_name: z.string().optional(),
  strength: z.string().min(1),
  dosage: z.string().min(1),
  quantity: z.number().int().positive(),
  frequency: z.string().optional(),
  duration_days: z.number().int().positive(),
  unit_price: z.number().nonnegative().default(0),
});

const prescriptionSchema = z.object({
  patient_id: z.string().uuid(),
  visit_id: z.string().uuid().optional(),
  pharmacy_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_member: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1).optional(),
  drug_name: z.string().optional(),
  strength: z.string().optional(),
  dosage: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  frequency: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
});

const labOrderSchema = z.object({
  patient_id: z.string().uuid(),
  visit_id: z.string().uuid().optional(),
  test_name: z.string().min(1),
  test_code: z.string().optional(),
});

const visitStatusSchema = z.object({
  status: z.nativeEnum(VisitStatus),
});

const referralSchema = z
  .object({
    patient_id: z.string().uuid(),
    visit_id: z.string().uuid().optional(),
    to_hospital_id: z.string().uuid().optional(),
    from_department: z.string().optional(),
    to_department: z.string().optional(),
    urgency: z.enum(["routine", "urgent", "emergency"]).default("routine"),
    reason: z.string().min(1),
    notes: z.string().optional(),
  })
  .refine((d) => d.to_hospital_id || d.to_department, {
    message: "to_hospital_id or to_department required",
  });

const staffInviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(HospitalStaffRole),
  department: z.string().optional(),
});

const staffRoleSchema = z.object({
  role: z.nativeEnum(HospitalStaffRole),
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayCheckins, waitingPatients, activeStaff, recentVisits] = await Promise.all([
      prisma.visit.count({
        where: { hospitalId, checkedInAt: { gte: startOfDay } },
      }),
      prisma.visit.count({
        where: { hospitalId, status: { in: ["waiting", "with_nurse", "with_doctor"] } },
      }),
      prisma.hospitalStaff.count({ where: { hospitalId, isActive: true } }),
      prisma.visit.findMany({
        where: { hospitalId },
        orderBy: { checkedInAt: "desc" },
        take: 10,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    res.json({
      today_checkins: todayCheckins,
      waiting_patients: waitingPatients,
      active_staff: activeStaff,
      ...(await getHospitalDashboardKpis(hospitalId)),
      recent_patients: recentVisits.map((v) => ({
        patient_id: v.patient.id,
        name: `${v.patient.firstName} ${v.patient.lastName}`,
        visit_id: v.id,
        status: v.status,
        checked_in_at: v.checkedInAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/patients", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const status = req.query.status as VisitStatus | undefined;
    const dateStr = req.query.date as string | undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);
    const search = req.query.search as string | undefined;

    const dateFilter = dateStr ? new Date(dateStr) : new Date();
    if (!dateStr) dateFilter.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateFilter);
    nextDay.setDate(nextDay.getDate() + 1);

    const visits = await prisma.visit.findMany({
      where: {
        hospitalId,
        checkedInAt: { gte: dateFilter, lt: nextDay },
        ...(status ? { status } : {}),
        ...(search
          ? {
              patient: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { nationalId: { contains: search, mode: "insensitive" } },
                  { user: { phone: { contains: search } } },
                ],
              },
            }
          : {}),
      },
      include: {
        patient: {
          include: { user: { select: { phone: true, email: true } } },
        },
      },
      orderBy: { checkedInAt: "desc" },
      take: limit,
      skip: offset,
    });

    res.json(
      visits.map((v) => ({
        patient_id: v.patient.id,
        name: `${v.patient.firstName} ${v.patient.lastName}`,
        phone: v.patient.user.phone,
        visit_id: v.id,
        status: v.status,
        department: v.department,
        priority: v.priority,
        checked_in_at: v.checkedInAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/patients/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.json([]);
      return;
    }

    const patients = await prisma.patient.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { nationalId: { contains: q, mode: "insensitive" } },
          { insuranceId: { contains: q, mode: "insensitive" } },
          { user: { phone: { contains: q } } },
          { id: q.length === 36 ? q : undefined },
        ],
      },
      take: 25,
      include: { user: { select: { phone: true, email: true } } },
    });

    res.json(
      patients.map((p) => ({
        patient_id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        phone: p.user.phone,
        email: p.user.email,
        national_id: p.nationalId,
        insurance_id: p.insuranceId,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/checkin", validateBody(checkinSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    let patientId = req.body.patient_id as string | undefined;

    if (!patientId && req.body.phone) {
      const user = await prisma.user.findFirst({
        where: { phone: req.body.phone, role: UserRole.patient },
        include: { patient: true },
      });
      if (!user?.patient) throw notFound("Patient not found for phone");
      patientId = user.patient.id;
    }

    if (!patientId) throw badRequest("Patient not found");

    await assertHospitalPatientAccess(hospitalId, patientId, userId);

    const visit = await prisma.visit.create({
      data: {
        patientId,
        hospitalId,
        department: req.body.department,
        priority: req.body.priority,
        recordedBy: userId,
        status: "waiting",
      },
    });

    await touchPatientData(patientId);

    res.status(201).json({
      visit_id: visit.id,
      checkin_time: visit.checkedInAt,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/patient/register", validateBody(registerPatientSchema), async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const body = req.body;
    const email = `${body.phone.replace(/\D/g, "")}@patients.miqorai.local`;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone: body.phone }, { email }] },
    });
    if (existing) throw badRequest("Patient already exists");

    const parts = body.full_name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || firstName;

    const user = await prisma.user.create({
      data: {
        email,
        phone: body.phone,
        passwordHash: hashPassword(randomToken().slice(0, 12)),
        role: UserRole.patient,
        organizationType: "none",
      },
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        dateOfBirth: new Date(body.date_of_birth),
        nationalId: body.national_id,
        insuranceId: body.insurance_id,
        gender: body.gender,
        emergencyContactName: body.emergency_contact_name,
        emergencyContactPhone: body.emergency_contact_phone,
      },
    });

    if (body.allergies?.length) {
      for (const allergy of body.allergies) {
        await prisma.medicalRecord.create({
          data: {
            patientId: patient.id,
            hospitalId,
            recordType: "allergy",
            data: allergy,
            recordedBy: req.user!.sub,
          },
        });
      }
    }

    await prisma.accessGrant.create({
      data: {
        patientId: patient.id,
        granteeType: "hospital",
        granteeId: hospitalId,
        grantedBy: req.user!.sub,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    await touchPatientData(patient.id);
    const qr = await getPatientQrImage(patient.id);

    res.status(201).json({
      patient_id: patient.id,
      qr_code: qr.qr_code,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const patientId = param(req.params.id);

    await assertHospitalPatientAccess(hospitalId, patientId, userId);

    const patient = await prisma.patient.findUnique({
      where: { id: patientId, isActive: true },
      include: {
        user: { select: { email: true, phone: true } },
        medicalRecords: { where: { isActive: true }, orderBy: { recordedAt: "desc" } },
        visits: { orderBy: { checkedInAt: "desc" }, take: 20 },
        prescriptions: { include: { items: true }, orderBy: { prescribedAt: "desc" }, take: 20 },
        labOrders: { orderBy: { orderedAt: "desc" }, take: 20 },
      },
    });
    if (!patient) throw notFound("Patient not found");

    res.json(patient);
  } catch (err) {
    next(err);
  }
});

router.post("/visit/:visitId/vitals", validateBody(vitalsSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const visit = await prisma.visit.findFirst({
      where: { id: param(req.params.visitId), hospitalId },
    });
    if (!visit) throw notFound("Visit not found");

    await assertHospitalPatientAccess(hospitalId, visit.patientId, userId);

    const vitals = {
      bp_systolic: req.body.bp_systolic,
      bp_diastolic: req.body.bp_diastolic,
      heart_rate: req.body.heart_rate,
      temperature: req.body.temperature,
      spo2: req.body.spo2,
      weight: req.body.weight,
      height: req.body.height,
      recorded_at: new Date().toISOString(),
    };

    const updated = await prisma.visit.update({
      where: { id: visit.id },
      data: { vitals, status: visit.status === "waiting" ? "with_nurse" : visit.status },
    });

    await touchPatientData(visit.patientId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.put("/visit/:visitId/diagnosis", validateBody(diagnosisSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const visit = await prisma.visit.findFirst({
      where: { id: param(req.params.visitId), hospitalId },
    });
    if (!visit) throw notFound("Visit not found");

    await assertHospitalPatientAccess(hospitalId, visit.patientId, userId);

    const updated = await prisma.visit.update({
      where: { id: visit.id },
      data: {
        diagnosisCodes: req.body.diagnosis_codes,
        chiefComplaint: req.body.chief_complaint,
        notes: req.body.notes,
        status: visit.status === "with_nurse" ? "with_doctor" : visit.status,
      },
    });

    if (req.body.diagnosis_codes?.length) {
      await prisma.medicalRecord.create({
        data: {
          patientId: visit.patientId,
          hospitalId,
          recordType: "diagnosis",
          data: {
            codes: req.body.diagnosis_codes,
            chief_complaint: req.body.chief_complaint,
            notes: req.body.notes,
            visit_id: visit.id,
          },
          recordedBy: userId,
        },
      });
    }

    await touchPatientData(visit.patientId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/prescription", validateBody(prescriptionSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const body = req.body;

    await assertHospitalPatientAccess(hospitalId, body.patient_id, userId);

    const items =
      body.items ??
      (body.drug_name
        ? [
            {
              drug_name: body.drug_name,
              strength: body.strength!,
              dosage: body.dosage!,
              quantity: body.quantity!,
              frequency: body.frequency,
              duration_days: body.duration_days!,
              unit_price: 0,
            },
          ]
        : []);

    if (!items.length) throw badRequest("At least one prescription item required");

    const totalAmount = items.reduce(
      (sum: number, item: z.infer<typeof prescriptionItemSchema>) =>
        sum + item.unit_price * item.quantity,
      0,
    );

    const prescription = await prisma.prescription.create({
      data: {
        patientId: body.patient_id,
        visitId: body.visit_id,
        hospitalId,
        pharmacyId: body.pharmacy_id,
        diagnosis: body.diagnosis,
        notes: body.notes,
        insuranceProvider: body.insurance_provider,
        insuranceMember: body.insurance_member,
        prescribedBy: userId,
        status: body.pharmacy_id ? PrescriptionStatus.sent_to_pharmacy : PrescriptionStatus.pending,
        totalAmount,
        items: {
          create: items.map((item: z.infer<typeof prescriptionItemSchema>) => ({
            drugName: item.drug_name,
            genericName: item.generic_name,
            strength: item.strength,
            dose: item.dosage,
            quantity: item.quantity,
            frequency: item.frequency,
            durationDays: item.duration_days,
            unitPrice: item.unit_price,
          })),
        },
      },
      include: { items: true },
    });

    await touchPatientData(body.patient_id);

    res.status(201).json({
      prescription_id: prescription.id,
      status: prescription.status,
      items: prescription.items,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/lab-order", validateBody(labOrderSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const body = req.body;

    await assertHospitalPatientAccess(hospitalId, body.patient_id, userId);

    const labOrder = await prisma.labOrder.create({
      data: {
        patientId: body.patient_id,
        visitId: body.visit_id,
        hospitalId,
        testName: body.test_name,
        testCode: body.test_code,
        orderedBy: userId,
        status: "ordered",
      },
    });

    await touchPatientData(body.patient_id);

    res.status(201).json({
      lab_order_id: labOrder.id,
      status: labOrder.status,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/checkins/today", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const visits = await prisma.visit.findMany({
      where: { hospitalId, checkedInAt: { gte: startOfDay } },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { checkedInAt: "asc" },
    });

    const now = Date.now();
    res.json({
      patients: visits.map((v) => ({
        patient_id: v.patient.id,
        name: `${v.patient.firstName} ${v.patient.lastName}`,
        visit_id: v.id,
        checkin_time: v.checkedInAt,
        department: v.department,
        priority: v.priority,
        status: v.status,
        wait_time: Math.round((now - v.checkedInAt.getTime()) / 60_000),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.put(
  "/checkin/:visitId/status",
  validateBody(visitStatusSchema),
  async (req, res, next) => {
    try {
      const { hospitalId } = await requireHospitalContext(req.user!);
      const visit = await prisma.visit.findFirst({
        where: { id: param(req.params.visitId), hospitalId },
      });
      if (!visit) throw notFound("Visit not found");

      const data: { status: VisitStatus; checkedOutAt?: Date } = { status: req.body.status };
      if (req.body.status === "completed" || req.body.status === "no_show") {
        data.checkedOutAt = new Date();
      }

      const updated = await prisma.visit.update({
        where: { id: visit.id },
        data,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/referrals", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const referrals = await prisma.referral.findMany({
      where: {
        OR: [{ fromHospitalId: hospitalId }, { toHospitalId: hospitalId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        fromHospital: { select: { id: true, name: true } },
        toHospital: { select: { id: true, name: true } },
      },
    });
    res.json(referrals);
  } catch (err) {
    next(err);
  }
});

router.post("/referral", validateBody(referralSchema), async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const body = req.body;

    const referral = await prisma.referral.create({
      data: {
        patientId: body.patient_id,
        visitId: body.visit_id,
        fromHospitalId: hospitalId,
        toHospitalId: body.to_hospital_id ?? hospitalId,
        fromDepartment: body.from_department,
        toDepartment: body.to_department,
        referralType: body.to_department && !body.to_hospital_id ? "intra_department" : "inter_hospital",
        urgency: body.urgency,
        reason: body.reason,
        notes: body.notes,
      },
    });

    res.status(201).json(referral);
  } catch (err) {
    next(err);
  }
});

router.get("/staff", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const staff = await prisma.hospitalStaff.findMany({
      where: { hospitalId, isActive: true },
      include: {
        user: { select: { id: true, email: true, phone: true, lastLoginAt: true } },
      },
    });
    res.json(
      staff.map((s) => ({
        id: s.id,
        user_id: s.userId,
        email: s.user.email,
        phone: s.user.phone,
        role: s.role,
        department: s.department,
        last_login_at: s.user.lastLoginAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/staff/invite", validateBody(staffInviteSchema), async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const body = req.body;
    const token = randomToken();

    const invitation = await prisma.invitation.create({
      data: {
        email: body.email.toLowerCase(),
        role: body.role,
        organizationId: hospitalId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + config.invitationExpiryDays * 24 * 60 * 60 * 1000),
      },
    });

    const inviteUrl = `${config.corsOrigins[0]}/invite?token=${token}`;
    await sendInvitationEmail(body.email, inviteUrl);

    res.status(201).json({
      invitation_id: invitation.id,
      invite_url: inviteUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/staff/:userId", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const staff = await prisma.hospitalStaff.findFirst({
      where: { hospitalId, userId: param(req.params.userId), isActive: true },
    });
    if (!staff) throw notFound("Staff member not found");

    await prisma.$transaction([
      prisma.hospitalStaff.update({ where: { id: staff.id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: staff.userId }, data: { isActive: false } }),
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/staff/:userId/role", validateBody(staffRoleSchema), async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const staff = await prisma.hospitalStaff.findFirst({
      where: { hospitalId, userId: param(req.params.userId), isActive: true },
    });
    if (!staff) throw notFound("Staff member not found");

    const updated = await prisma.hospitalStaff.update({
      where: { id: staff.id },
      data: { role: req.body.role },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get("/savings", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw notFound("Hospital not found");

    const savings = await prisma.savingsRecord.findMany({
      where: { attemptedProvider: hospital.name },
      orderBy: { createdAt: "desc" },
    });

    const duplicateTestsPrevented = savings.length;
    const estimatedSavings = savings.reduce((sum, s) => sum + Number(s.savings), 0);

    const byDepartment: Record<string, { count: number; savings: number }> = {};
    for (const record of savings) {
      const dept = record.category;
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, savings: 0 };
      byDepartment[dept].count += 1;
      byDepartment[dept].savings += Number(record.savings);
    }

    res.json({
      duplicate_tests_prevented: duplicateTestsPrevented,
      estimated_savings: estimatedSavings,
      by_department: Object.entries(byDepartment).map(([department, stats]) => ({
        department,
        ...stats,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const startDate = req.query.start_date
      ? new Date(String(req.query.start_date))
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(String(req.query.end_date)) : new Date();

    const visits = await prisma.visit.findMany({
      where: {
        hospitalId,
        checkedInAt: { gte: startDate, lte: endDate },
      },
      select: {
        patientId: true,
        department: true,
        checkedInAt: true,
        checkedOutAt: true,
      },
    });

    const uniquePatients = new Set(visits.map((v) => v.patientId)).size;
    const completed = visits.filter((v) => v.checkedOutAt);
    const avgWait =
      completed.length > 0
        ? completed.reduce((sum, v) => {
            const wait = v.checkedOutAt!.getTime() - v.checkedInAt.getTime();
            return sum + wait;
          }, 0) /
          completed.length /
          60_000
        : 0;

    const departmentVolume: Record<string, number> = {};
    for (const visit of visits) {
      departmentVolume[visit.department] = (departmentVolume[visit.department] ?? 0) + 1;
    }

    res.json({
      total_patients: uniquePatients,
      average_wait_time: Math.round(avgWait),
      department_volume: Object.entries(departmentVolume).map(([department, count]) => ({
        department,
        count,
      })),
      period: { start_date: startDate, end_date: endDate },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    const result = await listAuditLogs({
      organizationId: hospitalId,
      userId: req.query.user_id ? String(req.query.user_id) : undefined,
      action: req.query.action ? String(req.query.action) : undefined,
      startDate: req.query.start_date ? new Date(String(req.query.start_date)) : undefined,
      endDate: req.query.end_date ? new Date(String(req.query.end_date)) : undefined,
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/analytics/extended", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    const start = req.query.start_date
      ? new Date(String(req.query.start_date))
      : new Date(Date.now() - 30 * 86400000);
    const end = req.query.end_date ? new Date(String(req.query.end_date)) : new Date();
    res.json(await getExtendedHospitalAnalytics(hospitalId, start, end));
  } catch (err) {
    next(err);
  }
});

router.get("/patients/census", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(
      await getPatientCensus(hospitalId, {
        diagnosis: req.query.diagnosis ? String(req.query.diagnosis) : undefined,
        medication: req.query.medication ? String(req.query.medication) : undefined,
        age_min: req.query.age_min ? parseInt(String(req.query.age_min), 10) : undefined,
        age_max: req.query.age_max ? parseInt(String(req.query.age_max), 10) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id/qr", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getHospitalPatientQr(hospitalId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/visit/:visitId/checkout", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await completeVisitCheckout(hospitalId, param(req.params.visitId), req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/check-allergies", async (req, res, next) => {
  try {
    await requireHospitalContext(req.user!);
    res.json(await checkPrescriptionAllergies(req.body.patient_id, req.body.drug_names ?? []));
  } catch (err) {
    next(err);
  }
});

router.get("/labs/trends", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getLabTrends(hospitalId, req.query.patient_id ? String(req.query.patient_id) : undefined));
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id/labs/trends", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getLabTrends(hospitalId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.delete("/departments/:id", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await deleteDepartment(hospitalId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/notifications", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.status(201).json(await createHospitalNotification(hospitalId, req.body));
  } catch (err) {
    next(err);
  }
});

router.put("/notifications/read-all", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    res.json(await markAllNotificationsRead(hospitalId, userId));
  } catch (err) {
    next(err);
  }
});

router.post("/audit-logs/export", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    res.json(await exportHospitalAuditCsv(hospitalId, userId));
  } catch (err) {
    next(err);
  }
});

router.get("/billing/invoices/:id/pdf", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    res.json(await getHospitalInvoicePdf(hospitalId, param(req.params.id), userId));
  } catch (err) {
    next(err);
  }
});

router.get("/reports/schedule", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listReportSchedules("hospital", hospitalId));
  } catch (err) {
    next(err);
  }
});

router.post("/reports/schedule", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.status(201).json(await createReportSchedule("hospital", hospitalId, req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/staff/enriched", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listHospitalStaffEnriched(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.get("/departments", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listDepartments(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.post("/departments", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.status(201).json(await createDepartment(hospitalId, req.body));
  } catch (err) {
    next(err);
  }
});

router.put("/departments/:id", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await updateDepartment(hospitalId, param(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/notifications", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    res.json(await listHospitalNotifications(hospitalId, userId));
  } catch (err) {
    next(err);
  }
});

router.put("/notifications/:id/read", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    await markNotificationRead(hospitalId, param(req.params.id));
    res.json({ read: true });
  } catch (err) {
    next(err);
  }
});

router.get("/billing", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getHospitalBilling(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listHospitalReports(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.post("/reports/generate", async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    res.json(
      await generateHospitalReport(
        hospitalId,
        userId,
        String(req.body.type ?? "census"),
        req.body.format === "csv" ? "csv" : "pdf",
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/prescriptions", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listHospitalPrescriptions(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.get("/labs", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await listHospitalLabs(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id/summary", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getPatientAiSummary(hospitalId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.put("/visit/:visitId/assign", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(
      await assignVisitStaff(hospitalId, param(req.params.visitId), req.body.staff_user_id),
    );
  } catch (err) {
    next(err);
  }
});

router.put("/visit/:visitId/priority", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await updateVisitPriority(hospitalId, param(req.params.visitId), req.body.priority));
  } catch (err) {
    next(err);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await getHospitalSettings(hospitalId));
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const { hospitalId } = await requireHospitalContext(req.user!);
    res.json(await updateHospitalSettings(hospitalId, req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/system/health", async (req, res, next) => {
  try {
    await requireHospitalContext(req.user!);
    res.json(await getSystemHealth());
  } catch (err) {
    next(err);
  }
});

export default router;
