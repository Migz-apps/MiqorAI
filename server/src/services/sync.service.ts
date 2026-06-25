import { Prisma, SyncOperation, SyncStatus, VisitStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../utils/errors.js";
import { touchPatientData } from "./qr.service.js";

const MAX_RETRIES = 3;

export async function enqueueSyncItem(
  userId: string,
  operation: SyncOperation,
  resourceType: string,
  resourceData: Record<string, unknown>,
) {
  return prisma.syncQueue.create({
    data: {
      userId,
      operation,
      resourceType,
      resourceData: resourceData as Prisma.InputJsonValue,
      status: SyncStatus.pending,
    },
  });
}

export async function listUserSyncQueue(userId: string) {
  return prisma.syncQueue.findMany({
    where: { userId, status: { in: [SyncStatus.pending, SyncStatus.failed] } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function processSyncItem(itemId: string, userId: string) {
  const item = await prisma.syncQueue.findFirst({
    where: { id: itemId, userId },
  });
  if (!item) throw notFound("Sync item not found");
  if (item.status === SyncStatus.synced) return { status: "synced" };

  try {
    await applySyncOperation(item.operation, item.resourceType, item.resourceData as Record<string, unknown>, userId);
    await prisma.syncQueue.update({
      where: { id: item.id },
      data: { status: SyncStatus.synced, errorMessage: null },
    });
    return { status: "synced" };
  } catch (err) {
    const retryCount = item.retryCount + 1;
    const isConflict = (err as Error).message.includes("CONFLICT");
    await prisma.syncQueue.update({
      where: { id: item.id },
      data: {
        status: isConflict
          ? SyncStatus.conflict
          : retryCount >= MAX_RETRIES
            ? SyncStatus.failed
            : SyncStatus.pending,
        retryCount,
        errorMessage: (err as Error).message,
      },
    });
    throw err;
  }
}

async function applySyncOperation(
  operation: SyncOperation,
  resourceType: string,
  data: Record<string, unknown>,
  userId: string,
) {
  if (resourceType === "medical_record") {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw badRequest("Patient profile required");

    if (operation === "create") {
      await prisma.medicalRecord.create({
        data: {
          patientId: patient.id,
          recordType: data.record_type as never,
          data: data.data as object,
          recordedBy: userId,
        },
      });
      await touchPatientData(patient.id);
      return;
    }
    if (operation === "update" && data.id) {
      await prisma.medicalRecord.updateMany({
        where: { id: String(data.id), patientId: patient.id },
        data: { data: data.data as object },
      });
      await touchPatientData(patient.id);
      return;
    }
    if (operation === "delete" && data.id) {
      await prisma.medicalRecord.updateMany({
        where: { id: String(data.id), patientId: patient.id },
        data: { isActive: false },
      });
      await touchPatientData(patient.id);
      return;
    }
  }

  const staff = await prisma.hospitalStaff.findUnique({ where: { userId } });
  if (staff && resourceType === "visit") {
    if (operation === "create" || operation === "update") {
      const existing = data.id
        ? await prisma.visit.findFirst({ where: { id: String(data.id), hospitalId: staff.hospitalId } })
        : null;
      if (existing && data.updated_at && existing.updatedAt > new Date(String(data.updated_at))) {
        throw badRequest("Sync conflict: server version is newer", { code: "CONFLICT" });
      }
      if (existing) {
        await prisma.visit.update({
          where: { id: existing.id },
          data: {
            status: (data.status as VisitStatus) ?? existing.status,
            vitals: data.vitals as object | undefined,
            diagnosisCodes: (data.diagnosis_codes as string[]) ?? existing.diagnosisCodes,
          },
        });
      } else if (data.patient_id) {
        await prisma.visit.create({
          data: {
            hospitalId: staff.hospitalId,
            patientId: String(data.patient_id),
            department: String(data.department ?? "General"),
            visitType: String(data.visit_type ?? "consultation"),
            reason: data.reason ? String(data.reason) : undefined,
            priority: String(data.priority ?? "normal"),
            status: VisitStatus.waiting,
            checkedInAt: new Date(),
            recordedBy: userId,
          },
        });
      }
      if (data.patient_id) await touchPatientData(String(data.patient_id));
      return;
    }
  }

  if (staff && resourceType === "checkin") {
    const patientId = data.patient_id ? String(data.patient_id) : undefined;
    if (!patientId) throw badRequest("patient_id required for checkin sync");
    await prisma.visit.create({
      data: {
        hospitalId: staff.hospitalId,
        patientId,
        department: String(data.department ?? "General"),
        visitType: String(data.visit_type ?? "walk_in"),
        reason: data.reason ? String(data.reason) : undefined,
        priority: String(data.priority ?? "normal"),
        status: VisitStatus.waiting,
        checkedInAt: new Date(),
        recordedBy: userId,
      },
    });
    await touchPatientData(patientId);
    return;
  }

  if (staff && resourceType === "prescription") {
    if (operation === "create" && data.patient_id && data.items) {
      await prisma.prescription.create({
        data: {
          patientId: String(data.patient_id),
          hospitalId: staff.hospitalId,
          visitId: data.visit_id ? String(data.visit_id) : undefined,
          prescribedBy: userId,
          status: "pending",
          items: {
            create: (data.items as Array<Record<string, unknown>>).map((i) => ({
              drugName: String(i.drug_name),
              strength: String(i.strength ?? ""),
              dose: String(i.dosage ?? i.dose ?? "1"),
              quantity: Number(i.quantity ?? 1),
              durationDays: Number(i.duration_days ?? 7),
              unitPrice: Number(i.unit_price ?? 0),
            })),
          },
        },
      });
      await touchPatientData(String(data.patient_id));
      return;
    }
  }

  throw badRequest(`Unsupported sync resource: ${resourceType}`);
}

export async function pushSyncBatch(
  userId: string,
  items: Array<{ operation: SyncOperation; resource_type: string; resource_data: Record<string, unknown> }>,
) {
  const results = [];
  for (const item of items) {
    const row = await enqueueSyncItem(userId, item.operation, item.resource_type, item.resource_data);
    try {
      await processSyncItem(row.id, userId);
      results.push({ id: row.id, status: "synced" });
    } catch (err) {
      results.push({ id: row.id, status: "failed", error: (err as Error).message });
    }
  }
  return results;
}

export async function archiveOldAuditLogs(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
