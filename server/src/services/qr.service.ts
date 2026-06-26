import crypto from "crypto";
import QRCode from "qrcode";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { notFound } from "../utils/errors.js";

/**
 * QR codes auto-regenerate whenever patient clinical data changes
 * or when the current code exceeds QR_REFRESH_SECONDS age.
 */
export async function regeneratePatientQr(patientId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw notFound("Patient not found");

  const version = patient.qrVersion + 1;
  const raw = `${patientId}:${version}:${Date.now()}:${config.qrSecret}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      qrCodeHash: hash,
      qrVersion: version,
      qrUpdatedAt: new Date(),
    },
  });

  logger.debug("QR auto-regenerated", { patientId, version });
}

export function buildQrPayload(patientId: string, hash: string): string {
  return `miqorai://patient/${patientId}?v=${hash}`;
}

function isQrStale(updatedAt: Date | null): boolean {
  if (!updatedAt) return true;
  return Date.now() - updatedAt.getTime() > config.qrRefreshSeconds * 1000;
}

export async function getPatientQrImage(patientId: string): Promise<{
  qr_code: string;
  patient_id: string;
  hash: string;
  version: number;
  generated_at: string;
}> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || !patient.isActive) throw notFound("Patient not found");

  if (!patient.qrCodeHash || isQrStale(patient.qrUpdatedAt)) {
    await regeneratePatientQr(patientId);
  }

  const refreshed = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!refreshed?.qrCodeHash) throw notFound("Unable to generate QR");

  const payload = buildQrPayload(patientId, refreshed.qrCodeHash);
  const qr_code = await QRCode.toDataURL(payload);
  return {
    qr_code,
    patient_id: patientId,
    hash: refreshed.qrCodeHash,
    version: refreshed.qrVersion,
    generated_at: refreshed.qrUpdatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function resolveQrScan(
  patientId: string,
  hash: string,
  context: "hospital" | "pharmacy",
): Promise<Record<string, unknown>> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: { select: { email: true, phone: true } },
      prescriptions: {
        where:
          context === "pharmacy"
            ? { status: { in: ["pending", "verified", "ready", "sent_to_pharmacy"] } }
            : undefined,
        take: 10,
        orderBy: { prescribedAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!patient || !patient.isActive) throw notFound("Patient not found");
  if (!patient.qrCodeHash || patient.qrCodeHash !== hash) {
    throw notFound("Invalid or expired QR code");
  }
  if (isQrStale(patient.qrUpdatedAt)) {
    throw notFound("QR code expired — patient should refresh their app");
  }

  const allergies = await prisma.medicalRecord.findMany({
    where: { patientId, recordType: "allergy", isActive: true },
    take: 20,
  });

  return {
    patient_id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    date_of_birth: patient.dateOfBirth,
    insurance_id: patient.insuranceId,
    allergies: allergies.map((a) => a.data),
    prescriptions: patient.prescriptions,
    context,
  };
}

export async function validateQrScan(
  patientId: string,
  hash: string,
): Promise<{ patientId: string }> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      isActive: true,
      qrCodeHash: true,
      qrUpdatedAt: true,
    },
  });

  if (!patient || !patient.isActive) throw notFound("Patient not found");
  if (!patient.qrCodeHash || patient.qrCodeHash !== hash) {
    throw notFound("Invalid or expired QR code");
  }
  if (isQrStale(patient.qrUpdatedAt)) {
    throw notFound("QR code expired — patient should refresh their app");
  }

  return { patientId: patient.id };
}

/** Call after any mutation that changes patient medical footprint */
export async function touchPatientData(patientId: string): Promise<void> {
  await regeneratePatientQr(patientId);
}
