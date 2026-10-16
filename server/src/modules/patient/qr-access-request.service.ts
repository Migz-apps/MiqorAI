import { randomUUID } from "node:crypto";
import { AccessScope, type QrAccessRequest } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { badRequest, forbidden, notFound } from "../../shared/utils/errors.js";

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

function asStatus(status: string): QrAccessRequestStatus {
  return status === "approved" || status === "denied" || status === "expired" ? status : "pending";
}

function toValue(row: QrAccessRequest): QrAccessRequestValue {
  return {
    id: row.id,
    patientId: row.patientId,
    hospitalId: row.hospitalId,
    hospitalName: row.hospitalName,
    hospitalCode: row.hospitalCode,
    requesterId: row.requesterId,
    requesterEmail: row.requesterEmail,
    requesterName: row.requesterName,
    context: row.context === "pharmacy" ? "pharmacy" : "hospital",
    status: asStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString(),
  };
}

function currentStatus(request: QrAccessRequestValue): QrAccessRequestStatus {
  if (request.status === "pending" && new Date(request.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return request.status;
}

async function readRequest(id: string): Promise<QrAccessRequestValue> {
  const row = await prisma.qrAccessRequest.findUnique({ where: { id } });
  if (!row) throw notFound("QR access request not found");
  return toValue(row);
}

async function markStatus(id: string, status: QrAccessRequestStatus, respondedAt?: Date) {
  const row = await prisma.qrAccessRequest.update({
    where: { id },
    data: { status, ...(respondedAt ? { respondedAt } : {}) },
  });
  return toValue(row);
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
  const row = await prisma.qrAccessRequest.create({
    data: {
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
      createdAt: now,
      expiresAt: new Date(now.getTime() + REQUEST_TTL_MS),
    },
  });
  return toValue(row);
}

export async function getQrAccessRequestForRequester(id: string, requesterId: string) {
  const request = await readRequest(id);
  if (request.requesterId !== requesterId) throw forbidden("Access request belongs to another requester");
  const status = currentStatus(request);
  if (status === "expired" && request.status !== "expired") {
    await markStatus(id, status);
  }
  return { ...request, status };
}

export async function listPendingQrAccessRequestsForPatient(patientId: string) {
  const rows = await prisma.qrAccessRequest.findMany({
    where: { patientId, status: "pending", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toValue);
}

export async function approveQrAccessRequest(id: string, patientId: string, patientUserId: string) {
  const request = await readRequest(id);
  if (request.patientId !== patientId) throw forbidden("Access request belongs to another patient");
  if (currentStatus(request) !== "pending") throw badRequest("Access request is no longer pending");

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

  const approved = await markStatus(id, "approved", new Date());
  return { request: approved, grant };
}

export async function denyQrAccessRequest(id: string, patientId: string) {
  const request = await readRequest(id);
  if (request.patientId !== patientId) throw forbidden("Access request belongs to another patient");
  if (currentStatus(request) !== "pending") throw badRequest("Access request is no longer pending");

  return markStatus(id, "denied", new Date());
}
