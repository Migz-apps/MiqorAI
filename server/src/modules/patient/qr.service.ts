import crypto from "crypto";
import QRCode from "qrcode";
import { config } from "../../config.js";
import { prisma } from "../../shared/lib/prisma.js";
import { logger } from "../../shared/lib/logger.js";
import { AppError, notFound } from "../../shared/utils/errors.js";

/**
 * Rotating patient QR codes.
 *
 * A code is valid for QR_TTL_SECONDS from the moment it was generated, plus a
 * fixed clock-skew grace. Rotation is deliberate: it only happens when the
 * patient fetches their QR and the current code is past its TTL (or on explicit
 * regeneration, e.g. at registration). To avoid rejecting a code that was on
 * screen moments before a rotation, the immediately-previous hash stays
 * accepted until its own validity window ends.
 */

/** Extra seconds accepted past the TTL to absorb clock skew and scan latency. */
const QR_GRACE_SECONDS = 90;

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
      // Keep the outgoing code so in-flight scans still resolve.
      qrPrevCodeHash: patient.qrCodeHash,
      qrPrevUpdatedAt: patient.qrUpdatedAt,
    },
  });

  logger.debug("QR regenerated", { patientId, version });
}

export function buildQrPayload(patientId: string, hash: string): string {
  return `miqorai://patient/${patientId}?v=${hash}`;
}

/**
 * Past half its TTL: the patient's next fetch mints a fresh code, so a code on
 * screen always has at least half the validity window left. Clients refresh at
 * TTL/2 intervals, which keeps the displayed code perpetually valid.
 */
function isQrStale(updatedAt: Date | null): boolean {
  if (!updatedAt) return true;
  return Date.now() - updatedAt.getTime() > (config.qrTtlSeconds * 1000) / 2;
}

/** Scans stay valid for the TTL plus the clock-skew grace. */
function qrValidUntil(updatedAt: Date | null): number {
  if (!updatedAt) return 0;
  return updatedAt.getTime() + (config.qrTtlSeconds + QR_GRACE_SECONDS) * 1000;
}

type QrPatientFields = {
  qrCodeHash: string | null;
  qrUpdatedAt: Date | null;
  qrPrevCodeHash: string | null;
  qrPrevUpdatedAt: Date | null;
};

type QrMatch = "current" | "previous" | "expired" | "none";

function matchQrHash(patient: QrPatientFields, hash: string): QrMatch {
  const now = Date.now();
  if (patient.qrCodeHash && hash === patient.qrCodeHash) {
    return now <= qrValidUntil(patient.qrUpdatedAt) ? "current" : "expired";
  }
  if (patient.qrPrevCodeHash && hash === patient.qrPrevCodeHash) {
    return now <= qrValidUntil(patient.qrPrevUpdatedAt) ? "previous" : "expired";
  }
  return "none";
}

function qrExpired(): AppError {
  return new AppError(
    "QR_EXPIRED",
    "QR code expired — ask the patient to refresh their QR code",
    410,
  );
}

/**
 * Checks a presented hash against the patient's current and previous codes.
 * Throws QR_EXPIRED (410) when the hash is recognizable but out of window, and
 * NOT_FOUND (404) when it never belonged to this patient.
 */
function assertQrHashValid(patient: QrPatientFields, hash: string): void {
  const match = matchQrHash(patient, hash);
  if (match === "expired") throw qrExpired();
  if (match === "none") throw notFound("Invalid QR code");
}

export async function getPatientQrImage(patientId: string): Promise<{
  qr_code: string;
  patient_id: string;
  hash: string;
  version: number;
  generated_at: string;
  expires_at: string;
  ttl_seconds: number;
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
  const generatedAt = refreshed.qrUpdatedAt ?? new Date();
  return {
    qr_code,
    patient_id: patientId,
    hash: refreshed.qrCodeHash,
    version: refreshed.qrVersion,
    generated_at: generatedAt.toISOString(),
    expires_at: new Date(generatedAt.getTime() + config.qrTtlSeconds * 1000).toISOString(),
    ttl_seconds: config.qrTtlSeconds,
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
  assertQrHashValid(patient, hash);

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
      qrPrevCodeHash: true,
      qrPrevUpdatedAt: true,
    },
  });

  if (!patient || !patient.isActive) throw notFound("Patient not found");
  assertQrHashValid(patient, hash);

  return { patientId: patient.id };
}

/**
 * Historical hook called after mutations that change a patient's medical
 * footprint. It used to rotate the QR code as a side effect, which invalidated
 * codes that were still on a patient's screen while unrelated writes happened.
 * Rotation is now deliberate (TTL-driven inside getPatientQrImage), so this is
 * a no-op kept for call-site compatibility.
 */
export async function touchPatientData(_patientId: string): Promise<void> {
  // Intentionally empty: QR rotation is TTL-based, not mutation-based.
}
