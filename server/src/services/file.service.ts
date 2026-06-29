import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { randomToken } from "../utils/crypto.js";
import { forbidden, unauthorized } from "../utils/errors.js";

const SUPABASE_PREFIX = "supabase://";

function isSupabaseStorageEnabled() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

function getSupabaseHeaders(contentType?: string) {
  const headers: Record<string, string> = {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

function toSupabaseStoragePath(bucket: string, objectPath: string) {
  return `${SUPABASE_PREFIX}${bucket}/${objectPath}`;
}

function parseSupabaseStoragePath(storagePath: string) {
  if (!storagePath.startsWith(SUPABASE_PREFIX)) {
    return null;
  }

  const raw = storagePath.slice(SUPABASE_PREFIX.length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0) {
    throw new Error(`Invalid Supabase storage path: ${storagePath}`);
  }

  return {
    bucket: raw.slice(0, slashIndex),
    objectPath: raw.slice(slashIndex + 1),
  };
}

function buildStorageObjectPath(filename: string) {
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const day = new Date().toISOString().slice(0, 10);
  return `${day}/${randomToken()}-${safeFilename}`;
}

async function uploadToSupabaseStorage(
  filename: string,
  content: string | Buffer,
  mimeType: string,
): Promise<string> {
  const objectPath = buildStorageObjectPath(filename);
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.supabaseStorageBucket}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(mimeType),
      "x-upsert": "false",
    },
    body: typeof content === "string" ? content : new Uint8Array(content),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase storage upload failed: ${response.status} ${details}`.trim());
  }

  return toSupabaseStoragePath(config.supabaseStorageBucket, objectPath);
}

async function readFromSupabaseStorage(storagePath: string): Promise<Buffer> {
  const parsed = parseSupabaseStoragePath(storagePath);
  if (!parsed) {
    throw new Error(`Invalid Supabase storage path: ${storagePath}`);
  }

  const encodedPath = parsed.objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const downloadUrl = `${config.supabaseUrl}/storage/v1/object/authenticated/${parsed.bucket}/${encodedPath}`;
  const response = await fetch(downloadUrl, {
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase storage download failed: ${response.status} ${details}`.trim());
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function storeFile(
  filename: string,
  content: string | Buffer,
  mimeType: string,
): Promise<string> {
  if (isSupabaseStorageEnabled()) {
    return uploadToSupabaseStorage(filename, content, mimeType);
  }

  await ensureUploadDir();
  const storagePath = path.join(config.uploadDir, `${randomToken()}-${filename}`);
  await fs.writeFile(storagePath, content);
  return storagePath;
}

export async function ensureUploadDir(): Promise<void> {
  if (isSupabaseStorageEnabled()) {
    return;
  }

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
  const storagePath = await storeFile(filename, content, mimeType);
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
  const storagePath = await storeFile(filename, content, mimeType);
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

export async function readFileAssetContent(storagePath: string): Promise<Buffer> {
  const supabasePath = parseSupabaseStoragePath(storagePath);
  if (supabasePath) {
    return readFromSupabaseStorage(storagePath);
  }

  return fs.readFile(storagePath);
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

export function generateFileChecksum(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
