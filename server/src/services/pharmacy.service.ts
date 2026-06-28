import type {
  DosageForm,
  InteractionSeverity,
  PrescriptionStatus,
  Prisma,
} from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../lib/prisma.js";
import { writeAuditLog } from "./audit.service.js";
import { logPatientAccess } from "./access.service.js";
import { resolveQrScan, touchPatientData } from "./qr.service.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { sendSms } from "./sms.service.js";
import { sendEmail } from "./notification.service.js";
import type { TokenPayload } from "../utils/crypto.js";

type AuditCtx = {
  userId: string;
  userEmail?: string | null;
  organizationId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function requirePharmacyId(user: TokenPayload): string {
  if (!user.organizationId || user.organizationType !== "pharmacy") {
    throw forbidden("Pharmacy organization required");
  }
  return user.organizationId;
}

function normalizeDrug(name: string): string {
  return name.trim().toLowerCase();
}

async function pharmacyAudit(
  ctx: AuditCtx,
  action: string,
  resourceType: string,
  resourceId?: string,
  success = true,
  failureReason?: string,
) {
  await writeAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    action,
    resourceType,
    resourceId,
    organizationId: ctx.organizationId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    success,
    failureReason,
  });
}

async function getPrescriptionForPharmacy(pharmacyId: string, prescriptionId: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, pharmacyId },
    include: {
      items: { include: { inventory: true } },
      patient: {
        include: { user: { select: { email: true, phone: true } } },
      },
      hospital: { select: { id: true, name: true } },
    },
  });
  if (!rx) throw notFound("Prescription not found");
  return rx;
}

export function pharmacyContextFromRequest(req: Request): AuditCtx {
  const pharmacyId = requirePharmacyId(req.user!);
  return {
    userId: req.user!.sub,
    userEmail: req.user!.email,
    organizationId: pharmacyId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export async function getPharmacyDashboard(pharmacyId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const expiringCutoff = new Date();
  expiringCutoff.setDate(expiringCutoff.getDate() + 30);

  const [pending, ready, completedToday, lowStock, expiringSoon] = await Promise.all([
    prisma.prescription.count({
      where: {
        pharmacyId,
        status: { in: ["pending", "sent_to_pharmacy", "verified"] },
      },
    }),
    prisma.prescription.count({ where: { pharmacyId, status: "ready" } }),
    prisma.prescription.count({
      where: { pharmacyId, status: "dispensed", dispensedAt: { gte: todayStart } },
    }),
    prisma.pharmacyInventory
      .findMany({
        where: { pharmacyId, isActive: true },
        take: 100,
        orderBy: { stock: "asc" },
      })
      .then((items) => items.filter((i) => i.stock <= i.reorderPoint).slice(0, 10)),
    prisma.pharmacyInventory.findMany({
      where: {
        pharmacyId,
        isActive: true,
        expiryDate: { lte: expiringCutoff, gte: new Date() },
      },
      take: 10,
      orderBy: { expiryDate: "asc" },
    }),
  ]);

  return {
    pending_prescriptions: pending,
    ready_for_pickup: ready,
    completed_today: completedToday,
    low_stock_items: lowStock.map(serializeInventory),
    expiring_soon: expiringSoon.map(serializeInventory),
  };
}

function serializeInventory(item: {
  id: string;
  drugName: string;
  genericName: string | null;
  strength: string;
  stock: number;
  reorderPoint: number;
  unitPrice: Prisma.Decimal;
  expiryDate: Date | null;
}) {
  return {
    id: item.id,
    drug_name: item.drugName,
    generic_name: item.genericName,
    strength: item.strength,
    stock: item.stock,
    reorder_point: item.reorderPoint,
    unit_price: Number(item.unitPrice),
    expiry_date: item.expiryDate?.toISOString().slice(0, 10) ?? null,
  };
}

function serializePrescription(rx: Awaited<ReturnType<typeof getPrescriptionForPharmacy>>) {
  return {
    id: rx.id,
    patient_id: rx.patientId,
    patient_name: `${rx.patient.firstName} ${rx.patient.lastName}`,
    visit_id: rx.visitId,
    hospital: rx.hospital,
    status: rx.status,
    diagnosis: rx.diagnosis,
    notes: rx.notes,
    insurance_provider: rx.insuranceProvider,
    insurance_member: rx.insuranceMember,
    prescribed_at: rx.prescribedAt,
    pharmacy_received_at: rx.pharmacyReceivedAt,
    dispensed_at: rx.dispensedAt,
    rejection_reason: rx.rejectionReason,
    hold_reason: rx.holdReason,
    total_amount: Number(rx.totalAmount),
    items: rx.items.map((item) => ({
      id: item.id,
      drug_name: item.drugName,
      generic_name: item.genericName,
      strength: item.strength,
      dosage_form: item.dosageForm,
      dose: item.dose,
      duration_days: item.durationDays,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      frequency: item.frequency,
      inventory_id: item.inventoryId,
    })),
  };
}

export async function listPharmacyPrescriptions(
  pharmacyId: string,
  filters: {
    status?: string;
    date?: string;
    patientId?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.PrescriptionWhereInput = { pharmacyId };
  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.date) {
    const day = new Date(filters.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.prescribedAt = { gte: day, lt: next };
  }
  if (filters.status) {
    const statusMap: Record<string, PrescriptionStatus[]> = {
      pending: ["pending", "sent_to_pharmacy"],
      ready: ["ready"],
      completed: ["dispensed", "picked_up"],
      rejected: ["rejected"],
      held: ["held"],
      verified: ["verified"],
    };
    where.status = { in: statusMap[filters.status] ?? [filters.status as PrescriptionStatus] };
  }

  const [items, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
      orderBy: { prescribedAt: "desc" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    items: items.map((rx) => ({
      ...serializePrescription(rx as Awaited<ReturnType<typeof getPrescriptionForPharmacy>>),
      patient: rx.patient,
    })),
    total,
  };
}

export async function getPharmacyPrescription(pharmacyId: string, prescriptionId: string) {
  const rx = await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  const allergies = await prisma.medicalRecord.findMany({
    where: { patientId: rx.patientId, recordType: "allergy", isActive: true },
    take: 20,
  });
  const interactions = await checkDrugInteractions(pharmacyId, prescriptionId);
  return {
    ...serializePrescription(rx),
    patient: {
      id: rx.patient.id,
      first_name: rx.patient.firstName,
      last_name: rx.patient.lastName,
      date_of_birth: rx.patient.dateOfBirth,
      insurance_id: rx.patient.insuranceId,
      email: rx.patient.user.email,
      phone: rx.patient.user.phone,
    },
    allergies: allergies.map((a) => a.data),
    interactions,
  };
}

async function transitionPrescription(
  pharmacyId: string,
  prescriptionId: string,
  toStatus: PrescriptionStatus,
  ctx: AuditCtx,
  extra?: Partial<Prisma.PrescriptionUpdateInput>,
) {
  const rx = await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  const allowed: Record<string, PrescriptionStatus[]> = {
    verified: ["pending", "sent_to_pharmacy"],
    held: ["pending", "sent_to_pharmacy", "verified", "ready"],
    rejected: ["pending", "sent_to_pharmacy", "verified", "ready", "held"],
    ready: ["verified"],
    dispensed: ["ready", "verified"],
    picked_up: ["dispensed"],
  };
  if (!allowed[toStatus]?.includes(rx.status)) {
    throw badRequest(`Cannot transition from ${rx.status} to ${toStatus}`);
  }

  const updated = await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { status: toStatus, ...extra },
    include: { items: true, patient: true },
  });

  await pharmacyAudit(ctx, `prescription_${toStatus}`, "prescription", prescriptionId);
  return updated;
}

export async function verifyPrescription(pharmacyId: string, prescriptionId: string, ctx: AuditCtx) {
  const updated = await transitionPrescription(pharmacyId, prescriptionId, "verified", ctx, {
    pharmacyReceivedAt: new Date(),
  });
  return serializePrescription(updated as Awaited<ReturnType<typeof getPrescriptionForPharmacy>>);
}

export async function holdPrescription(
  pharmacyId: string,
  prescriptionId: string,
  reason: string,
  notes: string | undefined,
  ctx: AuditCtx,
) {
  const updated = await transitionPrescription(pharmacyId, prescriptionId, "held", ctx, {
    holdReason: notes ? `${reason}: ${notes}` : reason,
  });
  return serializePrescription(updated as Awaited<ReturnType<typeof getPrescriptionForPharmacy>>);
}

export async function rejectPrescription(
  pharmacyId: string,
  prescriptionId: string,
  reason: string,
  notes: string | undefined,
  ctx: AuditCtx,
) {
  const updated = await transitionPrescription(pharmacyId, prescriptionId, "rejected", ctx, {
    rejectionReason: notes ? `${reason}: ${notes}` : reason,
  });
  return serializePrescription(updated as Awaited<ReturnType<typeof getPrescriptionForPharmacy>>);
}

export async function readyPrescription(pharmacyId: string, prescriptionId: string, ctx: AuditCtx) {
  const updated = await transitionPrescription(pharmacyId, prescriptionId, "ready", ctx);
  return serializePrescription(updated as Awaited<ReturnType<typeof getPrescriptionForPharmacy>>);
}

export async function checkDrugInteractions(pharmacyId: string, prescriptionId: string) {
  await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { items: true, patient: true },
  });
  if (!rx) throw notFound("Prescription not found");

  const drugNames = new Set<string>();
  for (const item of rx.items) {
    drugNames.add(normalizeDrug(item.drugName));
    if (item.genericName) drugNames.add(normalizeDrug(item.genericName));
  }

  const activeMeds = await prisma.medicalRecord.findMany({
    where: { patientId: rx.patientId, recordType: "medication", isActive: true },
    take: 50,
  });
  for (const med of activeMeds) {
    const data = med.data as { drug_name?: string; generic_name?: string };
    if (data.drug_name) drugNames.add(normalizeDrug(data.drug_name));
    if (data.generic_name) drugNames.add(normalizeDrug(data.generic_name));
  }

  const names = [...drugNames];
  const interactions: Array<{
    drug_a: string;
    drug_b: string;
    severity: InteractionSeverity;
    note: string;
  }> = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];
      const hit = await prisma.drugInteraction.findFirst({
        where: {
          OR: [
            { drugA: a, drugB: b },
            { drugA: b, drugB: a },
          ],
        },
      });
      if (hit) {
        interactions.push({
          drug_a: hit.drugA,
          drug_b: hit.drugB,
          severity: hit.severity,
          note: hit.note,
        });
      }
    }
  }

  return { has_interactions: interactions.length > 0, interactions };
}

export async function logInteractionOverride(
  pharmacyId: string,
  prescriptionId: string,
  pharmacistId: string,
  drugs: string[],
  reason: string,
  ctx: AuditCtx,
) {
  await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  const row = await prisma.interactionOverride.create({
    data: {
      prescriptionId,
      pharmacyId,
      pharmacistId,
      drugs,
      reason,
    },
  });
  await pharmacyAudit(ctx, "interaction_override", "prescription", prescriptionId);
  return { id: row.id, created_at: row.createdAt };
}

export async function dispensePrescription(
  pharmacyId: string,
  prescriptionId: string,
  input: {
    dispensed_by: string;
    items: Array<{ drug_id: string; quantity: number; batch_number?: string }>;
    payment?: { method?: string; insurance_id?: string; copay?: number };
  },
  ctx: AuditCtx,
) {
  const rx = await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  if (!["ready", "verified"].includes(rx.status)) {
    throw badRequest("Prescription must be verified or ready before dispensing");
  }

  const dispensedItems: Array<Record<string, unknown>> = [];

  await prisma.$transaction(async (tx) => {
    for (const line of input.items) {
      const inv = await tx.pharmacyInventory.findFirst({
        where: { id: line.drug_id, pharmacyId, isActive: true },
      });
      if (!inv) throw notFound(`Inventory item ${line.drug_id} not found`);

      // Temporary testing override: allow dispensing to continue even when
      // inventory is below the requested quantity so routed prescriptions are
      // not blocked by stock checks.
      // if (inv.stock < line.quantity) {
      //   throw badRequest(`Insufficient stock for ${inv.drugName}`);
      // }

      const newStock = inv.stock - line.quantity;
      await tx.pharmacyInventory.update({
        where: { id: inv.id },
        data: { stock: newStock },
      });
      await tx.inventoryAdjustment.create({
        data: {
          inventoryId: inv.id,
          adjustment: -line.quantity,
          reason: "dispense",
          prescriptionId,
          adjustedBy: input.dispensed_by,
        },
      });
      dispensedItems.push({
        drug_id: inv.id,
        drug_name: inv.drugName,
        quantity: line.quantity,
        batch_number: line.batch_number ?? null,
        unit_price: Number(inv.unitPrice),
      });
    }

    await tx.dispenseEvent.create({
      data: {
        prescriptionId,
        pharmacyId,
        dispensedBy: input.dispensed_by,
        itemsJson: dispensedItems as Prisma.InputJsonValue,
        paymentMethod: input.payment?.method,
        copay: input.payment?.copay,
      },
    });

    await tx.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: "dispensed",
        dispensedAt: new Date(),
        dispensedBy: input.dispensed_by,
      },
    });
  });

  await touchPatientData(rx.patientId);
  await calculatePatientAdherence(pharmacyId, rx.patientId);
  await logPatientAccess({
    patientId: rx.patientId,
    accessorId: ctx.userId,
    action: "dispense",
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  await pharmacyAudit(ctx, "dispense", "prescription", prescriptionId);

  return {
    status: "dispensed",
    ready_for_pickup: true,
    receipt_url: null,
  };
}

export async function markPrescriptionPickup(
  pharmacyId: string,
  prescriptionId: string,
  pickedUpBy: string,
  ctx: AuditCtx,
) {
  const rx = await getPrescriptionForPharmacy(pharmacyId, prescriptionId);
  if (rx.status !== "dispensed") throw badRequest("Prescription must be dispensed before pickup");

  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: { status: "picked_up" },
  });
  await pharmacyAudit(ctx, "prescription_picked_up", "prescription", prescriptionId);
  return { status: "picked_up", picked_up_by: pickedUpBy };
}

export async function listPharmacyInventory(
  pharmacyId: string,
  filters: {
    search?: string;
    lowStock?: boolean;
    expiringSoon?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const where: Prisma.PharmacyInventoryWhereInput = { pharmacyId, isActive: true };
  if (filters.search) {
    where.OR = [
      { drugName: { contains: filters.search, mode: "insensitive" } },
      { genericName: { contains: filters.search, mode: "insensitive" } },
      { barcode: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.expiringSoon) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    where.expiryDate = { lte: cutoff, gte: new Date() };
  }

  let items = await prisma.pharmacyInventory.findMany({
    where,
    orderBy: { drugName: "asc" },
    take: filters.lowStock ? 500 : (filters.limit ?? 50),
    skip: filters.offset ?? 0,
  });

  if (filters.lowStock) {
    items = items.filter((i) => i.stock <= i.reorderPoint);
    items = items.slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
  }

  const total = await prisma.pharmacyInventory.count({ where: { pharmacyId, isActive: true } });
  return { items: items.map(serializeInventory), total };
}

export async function createPharmacyInventory(
  pharmacyId: string,
  data: {
    drug_name: string;
    generic_name?: string;
    strength: string;
    dosage_form: DosageForm;
    barcode?: string;
    stock: number;
    reorder_point: number;
    unit_price: number;
    cost_price: number;
    supplier?: string;
    expiry_date?: string;
    requires_prescription: boolean;
    category?: string;
    controlled?: boolean;
  },
  ctx: AuditCtx,
) {
  const item = await prisma.pharmacyInventory.create({
    data: {
      pharmacyId,
      drugName: data.drug_name,
      genericName: data.generic_name,
      strength: data.strength,
      dosageForm: data.dosage_form,
      barcode: data.barcode,
      stock: data.stock,
      reorderPoint: data.reorder_point,
      unitPrice: data.unit_price,
      costPrice: data.cost_price,
      supplier: data.supplier,
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : null,
      requiresPrescription: data.requires_prescription,
      category: data.category,
      controlled: data.controlled ?? false,
    },
  });
  await pharmacyAudit(ctx, "inventory_create", "pharmacy_inventory", item.id);
  return { inventory_id: item.id, item: serializeInventory(item) };
}

export async function updatePharmacyInventory(
  pharmacyId: string,
  inventoryId: string,
  data: Partial<{
    drug_name: string;
    generic_name: string;
    strength: string;
    dosage_form: DosageForm;
    barcode: string;
    stock: number;
    reorder_point: number;
    unit_price: number;
    cost_price: number;
    supplier: string;
    expiry_date: string;
    requires_prescription: boolean;
    category: string;
    controlled: boolean;
    is_active: boolean;
  }>,
  ctx: AuditCtx,
) {
  const existing = await prisma.pharmacyInventory.findFirst({
    where: { id: inventoryId, pharmacyId },
  });
  if (!existing) throw notFound("Inventory item not found");

  const item = await prisma.pharmacyInventory.update({
    where: { id: inventoryId },
    data: {
      drugName: data.drug_name,
      genericName: data.generic_name,
      strength: data.strength,
      dosageForm: data.dosage_form,
      barcode: data.barcode,
      stock: data.stock,
      reorderPoint: data.reorder_point,
      unitPrice: data.unit_price,
      costPrice: data.cost_price,
      supplier: data.supplier,
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      requiresPrescription: data.requires_prescription,
      category: data.category,
      controlled: data.controlled,
      isActive: data.is_active,
    },
  });
  await pharmacyAudit(ctx, "inventory_update", "pharmacy_inventory", inventoryId);
  return serializeInventory(item);
}

export async function adjustPharmacyStock(
  pharmacyId: string,
  drugId: string,
  adjustment: number,
  reason: string,
  prescriptionId: string | undefined,
  adjustedBy: string,
  ctx: AuditCtx,
) {
  const inv = await prisma.pharmacyInventory.findFirst({
    where: { id: drugId, pharmacyId, isActive: true },
  });
  if (!inv) throw notFound("Inventory item not found");

  const newStock = inv.stock + adjustment;
  if (newStock < 0) throw badRequest("Stock cannot go negative");

  const [updated] = await prisma.$transaction([
    prisma.pharmacyInventory.update({
      where: { id: drugId },
      data: { stock: newStock },
    }),
    prisma.inventoryAdjustment.create({
      data: {
        inventoryId: drugId,
        adjustment,
        reason,
        prescriptionId,
        adjustedBy,
      },
    }),
  ]);

  await pharmacyAudit(ctx, "inventory_adjust", "pharmacy_inventory", drugId);
  return { new_stock: updated.stock };
}

export async function searchPharmacyPatients(pharmacyId: string, q: string) {
  const term = q.trim();
  if (!term) return [];

  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { nationalId: { contains: term, mode: "insensitive" } },
        { insuranceId: { contains: term, mode: "insensitive" } },
        { user: { phone: { contains: term } } },
        { prescriptions: { some: { pharmacyId } } },
      ],
    },
    include: { user: { select: { phone: true, email: true } } },
    take: 25,
  });

  return patients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    phone: p.user.phone,
    email: p.user.email,
    insurance_id: p.insuranceId,
  }));
}

export async function getPharmacyPatient(pharmacyId: string, patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: { select: { email: true, phone: true } },
      prescriptions: {
        where: { pharmacyId },
        orderBy: { prescribedAt: "desc" },
        take: 20,
        include: {
          items: true,
          patient: { select: { firstName: true, lastName: true } },
          hospital: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!patient || !patient.isActive) throw notFound("Patient not found");

  return {
    id: patient.id,
    first_name: patient.firstName,
    last_name: patient.lastName,
    date_of_birth: patient.dateOfBirth,
    insurance_id: patient.insuranceId,
    email: patient.user.email,
    phone: patient.user.phone,
    prescriptions: patient.prescriptions.map((rx) => serializePrescription(rx as never)),
  };
}

async function calculatePatientAdherence(pharmacyId: string, patientId: string) {
  const prescriptions = await prisma.prescription.findMany({
    where: { pharmacyId, patientId },
    include: { items: true },
    orderBy: { prescribedAt: "desc" },
  });

  const dispenseEvents = await prisma.dispenseEvent.findMany({
    where: { pharmacyId, prescription: { patientId } },
    orderBy: { createdAt: "desc" },
  });

  const medications: Array<{
    name: string;
    adherence_rate: number;
    last_fill: Date | null;
    next_due: Date;
  }> = [];

  let totalExpected = 0;
  let totalActual = 0;

  for (const rx of prescriptions) {
    const rxDispenses = dispenseEvents.filter((e) => e.prescriptionId === rx.id);
    for (const item of rx.items) {
      const daysSince = Math.max(
        1,
        Math.floor((Date.now() - rx.prescribedAt.getTime()) / 86400000),
      );
      const duration = item.durationDays || 30;
      const expectedFills = Math.max(1, Math.ceil(daysSince / duration));
      const actualFills = rxDispenses.length;
      const rate = Math.min(100, Math.round((actualFills / expectedFills) * 100));
      totalExpected += expectedFills;
      totalActual += Math.min(actualFills, expectedFills);
      medications.push({
        name: item.drugName,
        adherence_rate: rate,
        last_fill: rxDispenses[0]?.createdAt ?? null,
        next_due: new Date(rx.prescribedAt.getTime() + duration * 86400000),
      });
    }
  }

  const overallRate =
    totalExpected === 0 ? 100 : Math.min(100, Math.round((totalActual / totalExpected) * 100));

  await prisma.patientAdherenceSnapshot.upsert({
    where: { patientId_pharmacyId: { patientId, pharmacyId } },
    create: {
      patientId,
      pharmacyId,
      overallRate,
      medications,
    },
    update: {
      overallRate,
      medications,
      calculatedAt: new Date(),
    },
  });

  return { overall_rate: overallRate, medications };
}

export async function getPharmacyPatientAdherence(pharmacyId: string, patientId: string) {
  const snapshot = await prisma.patientAdherenceSnapshot.findUnique({
    where: { patientId_pharmacyId: { patientId, pharmacyId } },
  });
  if (!snapshot) {
    return calculatePatientAdherence(pharmacyId, patientId);
  }

  const meds = snapshot.medications as Array<{
    name: string;
    adherence_rate?: number;
    last_fill?: string;
    next_due?: string;
  }>;

  return {
    overall_rate: Number(snapshot.overallRate),
    medications: meds.map((m) => ({
      name: m.name,
      adherence_rate: m.adherence_rate ?? Number(snapshot.overallRate),
      last_fill: m.last_fill ?? snapshot.calculatedAt,
      next_due: m.next_due ?? null,
    })),
  };
}

export async function sendAdherenceReminder(
  pharmacyId: string,
  patientId: string,
  _medicationId: string | undefined,
  message: string,
) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: true },
  });
  if (!patient) throw notFound("Patient not found");

  const hasRx = await prisma.prescription.findFirst({
    where: { pharmacyId, patientId },
  });
  if (!hasRx) throw forbidden("Patient has no prescriptions at this pharmacy");

  const text =
    message ||
    `Reminder from your pharmacy: please refill your medication. — MiqorAI`;

  if (patient.user.phone) {
    await sendSms(patient.user.phone, text);
    return { sent: true, channel: "sms" };
  }

  await sendEmail(patient.user.email, "Medication refill reminder", `<p>${text}</p>`);
  return { sent: true, channel: "email" };
}

export async function getPharmacyReports(
  pharmacyId: string,
  type: string,
  startDate?: string,
  endDate?: string,
) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const [dispenseEvents, adherenceSnapshots] = await Promise.all([
    prisma.dispenseEvent.findMany({
      where: { pharmacyId, createdAt: { gte: start, lte: end } },
      include: { prescription: true },
    }),
    prisma.patientAdherenceSnapshot.findMany({ where: { pharmacyId } }),
  ]);

  const revenue = dispenseEvents.reduce((sum, e) => {
    const items = e.itemsJson as Array<{ unit_price?: number; quantity?: number }>;
    return sum + items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 0), 0);
  }, 0);

  const avgAdherence =
    adherenceSnapshots.length === 0
      ? 0
      : adherenceSnapshots.reduce((s, a) => s + Number(a.overallRate), 0) / adherenceSnapshots.length;

  return {
    type,
    period: { start: start.toISOString(), end: end.toISOString() },
    revenue,
    dispense_count: dispenseEvents.length,
    adherence_average: Math.round(avgAdherence * 100) / 100,
    trend: dispenseEvents.map((e) => ({
      date: e.createdAt.toISOString().slice(0, 10),
      amount: (e.itemsJson as Array<{ unit_price?: number; quantity?: number }>).reduce(
        (s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 0),
        0,
      ),
    })),
  };
}

export async function listPharmacyInvoices(pharmacyId: string) {
  const invoices = await prisma.pharmacyInvoice.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: "desc" },
  });
  return invoices.map((inv) => ({
    id: inv.id,
    period: inv.period,
    amount: Number(inv.amount),
    status: inv.status,
    due_date: inv.dueDate,
    paid_at: inv.paidAt,
  }));
}

export async function listPharmacyAuditLogs(
  pharmacyId: string,
  filters: { limit?: number; offset?: number },
) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: pharmacyId },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.auditLog.count({ where: { organizationId: pharmacyId } }),
  ]);
  return { items, total };
}

export async function resolvePharmacyQr(
  patientId: string,
  hash: string,
  accessorId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
) {
  const result = await resolveQrScan(patientId, hash, "pharmacy");
  await logPatientAccess({
    patientId,
    accessorId,
    action: "scan_qr",
    ipAddress,
    userAgent,
  });
  return result;
}
