import { randomUUID } from "node:crypto";
import { AccessScope } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

const KEY_PREFIX = "qr_access_request:";
const REQUEST_TTL_MS = 10 * 60 * 1000;
const GRANT_TTL_MS = 24 * 60 * 60 * 1000;

type QrAccessRequestStatus = "pending" | "approved" | "denied" | "expired";

export type QrAccessRequestValue = {
  id: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  context: "hospital" | "pharmacy";
  status: QrAccessRequestStatus;
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
};

function keyFor(id: string) {
  return `${KEY_PREFIX}${id}`;
}

function asRequest(value: unknown): QrAccessRequestValue | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<QrAccessRequestValue>;
  if (!v.id || !v.patientId || !v.hospitalId || !v.requesterId || !v.status) return null;
  return v as QrAccessRequestValue;
}

function currentStatus(request: QrAccessRequestValue): QrAccessRequestStatus {
  if (request.status === "pending" && new Date(request.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return request.status;
}

async function readRequest(id: string): Promise<QrAccessRequestValue> {
  const row = await prisma.platformSetting.findUnique({ where: { key: keyFor(id) } });
  const request = asRequest(row?.value);
  if (!request) throw notFound("QR access request not found");
  return request;
}

async function writeRequest(request: QrAccessRequestValue) {
  await prisma.platformSetting.upsert({
    where: { key: keyFor(request.id) },
    create: { key: keyFor(request.id), value: request },
    update: { value: request },
  });
}

export async function createQrAccessRequest(input: {
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCode: string;
  requesterId: string;
  requesterEmail: string;
  requesterName?: string | null;
  context: "hospital" | "pharmacy";
}) {
  const now = new Date();
  const request: QrAccessRequestValue = {
    id: randomUUID(),
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    hospitalName: input.hospitalName,
    hospitalCode: input.hospitalCode,
    requesterId: input.requesterId,
    requesterEmail: input.requesterEmail,
    requesterName: input.requesterName || input.requesterEmail,
    context: input.context,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REQUEST_TTL_MS).toISOString(),
  };

  await writeRequest(request);
  return request;
}

export async function getQrAccessRequestForRequester(id: string, requesterId: string) {
  const request = await readRequest(id);
  if (request.requesterId !== requesterId) throw forbidden("Access request belongs to another requester");
  const status = currentStatus(request);
  if (status === "expired" && request.status !== "expired") {
    await writeRequest({ ...request, status });
  }
  return { ...request, status };
}

export async function listPendingQrAccessRequestsForPatient(patientId: string) {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { startsWith: KEY_PREFIX } },
  });
  const requests = rows
    .map((row) => asRequest(row.value))
    .filter((request): request is QrAccessRequestValue => Boolean(request))
    .filter((request) => request.patientId === patientId)
    .map((request) => ({ ...request, status: currentStatus(request) }))
    .filter((request) => request.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return requests;
}

export async function approveQrAccessRequest(id: string, patientId: string, patientUserId: string) {
  const request = await readRequest(id);
  if (request.patientId !== patientId) throw forbidden("Access request belongs to another patient");
  if (currentStatus(request) !== "pending") throw badRequest("Access request is no longer pending");

  const approved: QrAccessRequestValue = {
    ...request,
    status: "approved",
    respondedAt: new Date().toISOString(),
  };

  const grant = await prisma.accessGrant.create({
    data: {
      patientId,
      granteeType: "hospital",
      granteeId: request.hospitalId,
      scope: AccessScope.full,
      grantedBy: patientUserId,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    },
  });

  await writeRequest(approved);
  return { request: approved, grant };
}

export async function denyQrAccessRequest(id: string, patientId: string) {
  const request = await readRequest(id);
  if (request.patientId !== patientId) throw forbidden("Access request belongs to another patient");
  if (currentStatus(request) !== "pending") throw badRequest("Access request is no longer pending");

  const denied: QrAccessRequestValue = {
    ...request,
    status: "denied",
    respondedAt: new Date().toISOString(),
  };
  await writeRequest(denied);
  return denied;
}
