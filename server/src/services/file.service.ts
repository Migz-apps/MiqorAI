import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { randomToken } from "../utils/crypto.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

export function createSignedFileToken(fileId: string, userId: string): string {
  return jwt.sign({ fileId, userId, type: "file" }, config.fileSigningSecret, { expiresIn: "1h" });
}

export function verifySignedFileToken(token: string): { fileId: string; userId: string } {
  const decoded = jwt.verify(token, config.fileSigningSecret) as {
    fileId: string;
    userId: string;
    type?: string;
  };
  if (decoded.type !== "file") throw unauthorized("Invalid file token");
  return { fileId: decoded.fileId, userId: decoded.userId };
}

export async function saveExportFile(
  ownerUserId: string,
  filename: string,
  content: string | Buffer,
  mimeType: string,
): Promise<string> {
  await ensureUploadDir();
  const storagePath = path.join(config.uploadDir, `${randomToken()}-${filename}`);
  await fs.writeFile(storagePath, content);
  const asset = await prisma.fileAsset.create({
    data: {
      ownerUserId,
      resourceType: "export",
      filename,
      mimeType,
      storagePath,
    },
  });
  const token = createSignedFileToken(asset.id, ownerUserId);
  return `${config.baseUrl}/api/files/${asset.id}?token=${token}`;
}

export async function saveUploadedFile(
  ownerUserId: string,
  filename: string,
  content: Buffer,
  mimeType: string,
  resourceType: string,
  resourceId?: string,
): Promise<{ id: string; download_url: string }> {
  await ensureUploadDir();
  const storagePath = path.join(config.uploadDir, `${randomToken()}-${filename}`);
  await fs.writeFile(storagePath, content);
  const asset = await prisma.fileAsset.create({
    data: {
      ownerUserId,
      resourceType,
      resourceId: resourceId ?? null,
      filename,
      mimeType,
      storagePath,
    },
  });
  const token = createSignedFileToken(asset.id, ownerUserId);
  return {
    id: asset.id,
    download_url: `${config.baseUrl}/api/files/${asset.id}?token=${token}`,
  };
}

export async function getFileAsset(id: string) {
  return prisma.fileAsset.findUnique({ where: { id } });
}

export async function assertFileAccess(
  assetId: string,
  userId: string | undefined,
  signedToken?: string,
): Promise<Awaited<ReturnType<typeof getFileAsset>>> {
  const asset = await getFileAsset(assetId);
  if (!asset) return null;

  if (signedToken) {
    const decoded = verifySignedFileToken(signedToken);
    if (decoded.fileId !== assetId) throw forbidden("Token does not match file");
    return asset;
  }

  if (!userId) throw unauthorized("Authentication or signed token required");
  if (asset.ownerUserId && asset.ownerUserId !== userId) throw forbidden("Access denied");
  return asset;
}
