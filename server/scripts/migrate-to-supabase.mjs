import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { Prisma, PrismaClient } from "@prisma/client";

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;
const RESET_TARGET = process.env.RESET_TARGET === "true";
const MIGRATE_FILES = process.env.MIGRATE_FILES === "true";
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "miqorai-uploads";
const LOCAL_UPLOAD_ROOT = process.env.LOCAL_UPLOAD_ROOT
  ? path.resolve(process.env.LOCAL_UPLOAD_ROOT)
  : path.resolve(process.cwd(), "uploads");
const NEW_BASE_URL = (process.env.NEW_BASE_URL ?? "").replace(/\/$/, "");
const FILE_SIGNING_SECRET = process.env.FILE_SIGNING_SECRET ?? "";

if (!SOURCE_DATABASE_URL) {
  throw new Error("Missing SOURCE_DATABASE_URL");
}

if (!TARGET_DATABASE_URL) {
  throw new Error("Missing TARGET_DATABASE_URL");
}

const source = new PrismaClient({
  datasources: { db: { url: SOURCE_DATABASE_URL } },
});

const target = new PrismaClient({
  datasources: { db: { url: TARGET_DATABASE_URL } },
});

const models = Prisma.dmmf.datamodel.models;

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function chunk(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function relationDependencies(model) {
  return new Set(
    model.fields
      .filter((field) => field.kind === "object" && field.relationFromFields?.length)
      .map((field) => field.type)
      .filter((type) => type !== model.name),
  );
}

function topologicalOrder() {
  const dependencies = new Map();
  const dependents = new Map();

  for (const model of models) {
    dependencies.set(model.name, relationDependencies(model));
    dependents.set(model.name, new Set());
  }

  for (const [modelName, deps] of dependencies.entries()) {
    for (const dep of deps) {
      dependents.get(dep)?.add(modelName);
    }
  }

  const ready = models
    .map((model) => model.name)
    .filter((modelName) => dependencies.get(modelName)?.size === 0);
  const ordered = [];

  while (ready.length) {
    const current = ready.shift();
    ordered.push(current);
    for (const dependent of dependents.get(current) ?? []) {
      const depSet = dependencies.get(dependent);
      depSet?.delete(current);
      if (depSet?.size === 0) {
        ready.push(dependent);
      }
    }
  }

  if (ordered.length !== models.length) {
    const unresolved = models
      .map((model) => model.name)
      .filter((modelName) => !ordered.includes(modelName));
    throw new Error(`Could not determine model copy order. Unresolved models: ${unresolved.join(", ")}`);
  }

  return ordered;
}

function log(message) {
  console.log(`[migrate:supabase] ${message}`);
}

function getDelegate(client, modelName) {
  const delegate = client[delegateName(modelName)];
  if (!delegate) {
    throw new Error(`Missing Prisma delegate for model ${modelName}`);
  }
  return delegate;
}

async function countRows(client, modelName) {
  return getDelegate(client, modelName).count();
}

async function totalRows(client) {
  let total = 0;
  for (const model of models) {
    total += await countRows(client, model.name);
  }
  return total;
}

async function resetTargetData(order) {
  for (const modelName of [...order].reverse()) {
    const delegate = getDelegate(target, modelName);
    await delegate.deleteMany();
    log(`Cleared ${modelName}`);
  }
}

async function copyModel(modelName) {
  const sourceDelegate = getDelegate(source, modelName);
  const targetDelegate = getDelegate(target, modelName);
  const rows = await sourceDelegate.findMany();

  if (!rows.length) {
    log(`Skipped ${modelName} (0 rows)`);
    return 0;
  }

  for (const batch of chunk(rows, 100)) {
    await targetDelegate.createMany({ data: batch });
  }

  log(`Copied ${rows.length} rows into ${modelName}`);
  return rows.length;
}

function supabaseHeaders(contentType) {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

async function ensureBucketExists() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when MIGRATE_FILES=true");
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: supabaseHeaders("application/json"),
    body: JSON.stringify({
      id: SUPABASE_STORAGE_BUCKET,
      name: SUPABASE_STORAGE_BUCKET,
      public: false,
    }),
  });

  if (response.ok || response.status === 409) {
    log(`Supabase bucket ready: ${SUPABASE_STORAGE_BUCKET}`);
    return;
  }

  const details = await response.text().catch(() => "");
  throw new Error(`Bucket creation failed: ${response.status} ${details}`.trim());
}

function safeObjectPath(asset) {
  const baseName = path.basename(asset.storagePath || asset.filename || crypto.randomUUID());
  return `migrated/${baseName.replace(/[^a-zA-Z0-9._/-]/g, "_")}`;
}

async function uploadAssetToSupabase(asset) {
  const assetPath = path.isAbsolute(asset.storagePath)
    ? asset.storagePath
    : path.resolve(process.cwd(), asset.storagePath);
  const fileContent = await fs.readFile(assetPath);
  const objectPath = safeObjectPath(asset);
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...supabaseHeaders(asset.mimeType || "application/octet-stream"),
      "x-upsert": "true",
    },
    body: new Uint8Array(fileContent),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Upload failed for ${asset.filename}: ${response.status} ${details}`.trim());
  }

  return `supabase://${SUPABASE_STORAGE_BUCKET}/${objectPath}`;
}

async function migrateFileAssets() {
  await ensureBucketExists();

  const fileAssets = await target.fileAsset.findMany({
    where: {
      NOT: {
        storagePath: {
          startsWith: "supabase://",
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!fileAssets.length) {
    log("No local file assets to upload");
    return;
  }

  log(`Uploading ${fileAssets.length} file assets from ${LOCAL_UPLOAD_ROOT}`);

  for (const asset of fileAssets) {
    const currentPath = asset.storagePath.replace(/^\.?[\\/]/, "");
    const normalizedPath = path.isAbsolute(asset.storagePath)
      ? asset.storagePath
      : path.resolve(
          currentPath.startsWith("uploads")
            ? path.resolve(process.cwd(), currentPath)
            : path.join(LOCAL_UPLOAD_ROOT, currentPath),
        );

    const fileOnDisk = await fs.stat(normalizedPath).then(() => normalizedPath).catch(() => null);
    if (!fileOnDisk) {
      throw new Error(`Local upload missing for asset ${asset.id}: ${asset.storagePath}`);
    }

    const supabasePath = await uploadAssetToSupabase({ ...asset, storagePath: fileOnDisk });
    await target.fileAsset.update({
      where: { id: asset.id },
      data: { storagePath: supabasePath },
    });
    log(`Uploaded ${asset.filename}`);
  }
}

function parseFileIdFromDownloadUrl(downloadUrl) {
  if (!downloadUrl) return null;
  const match = downloadUrl.match(/\/api\/files\/([^?]+)/i);
  return match?.[1] ?? null;
}

function signDownloadUrl(fileId, userId) {
  if (!NEW_BASE_URL || !FILE_SIGNING_SECRET) {
    return null;
  }

  const token = jwt.sign(
    { fileId, userId: userId || "migration", type: "file" },
    FILE_SIGNING_SECRET,
    { expiresIn: "1h" },
  );

  return `${NEW_BASE_URL}/api/files/${fileId}?token=${token}`;
}

async function refreshHistoricalReportUrls() {
  if (!NEW_BASE_URL || !FILE_SIGNING_SECRET) {
    log("Skipping report_history URL refresh (NEW_BASE_URL or FILE_SIGNING_SECRET missing)");
    return;
  }

  const reports = await target.reportHistory.findMany({
    orderBy: { createdAt: "asc" },
  });

  for (const report of reports) {
    const fileId = parseFileIdFromDownloadUrl(report.downloadUrl);
    if (!fileId) continue;

    const asset = await target.fileAsset.findUnique({ where: { id: fileId } });
    if (!asset) continue;

    const freshUrl = signDownloadUrl(asset.id, asset.ownerUserId || report.createdBy || "migration");
    if (!freshUrl) continue;

    await target.reportHistory.update({
      where: { id: report.id },
      data: { downloadUrl: freshUrl },
    });
  }

  log("Refreshed historical report download URLs");
}

async function main() {
  const order = topologicalOrder();
  log(`Model copy order: ${order.join(" -> ")}`);

  const sourceTotal = await totalRows(source);
  log(`Source has ${sourceTotal} total rows across ${models.length} models`);

  const targetTotal = await totalRows(target).catch(() => null);
  if (targetTotal === null) {
    throw new Error(
      "Target database schema is not ready. Run `npx prisma db push` against the target database first.",
    );
  }

  log(`Target currently has ${targetTotal} total rows`);

  if (targetTotal > 0 && !RESET_TARGET) {
    throw new Error(
      "Target database is not empty. Re-run with RESET_TARGET=true if you want this script to replace its data.",
    );
  }

  if (targetTotal > 0 && RESET_TARGET) {
    await resetTargetData(order);
  }

  for (const modelName of order) {
    await copyModel(modelName);
  }

  if (MIGRATE_FILES) {
    await migrateFileAssets();
  }

  await refreshHistoricalReportUrls();

  const verification = {};
  for (const model of models) {
    verification[model.name] = {
      source: await countRows(source, model.name),
      target: await countRows(target, model.name),
    };
  }

  console.log(JSON.stringify({ migrated: true, verification }, null, 2));
}

try {
  await main();
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
