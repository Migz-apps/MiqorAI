import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEED_DATA_DIR = path.resolve(__dirname, "../../seed_data");

export function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(SEED_DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0]!;
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? "";
    });
    return record;
  });
}

export function parseBool(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

export function parseOptionalDate(value: string | undefined): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return new Date(trimmed);
}

export function parseRequiredDate(value: string | undefined, label: string): Date {
  const parsed = parseOptionalDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date for ${label}: ${value}`);
  }
  return parsed;
}

export function parseLooseJson(value: string | undefined, label: string): unknown {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/'/g, '"')
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false");
  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error(`Invalid JSON for ${label}: ${value}`);
  }
}

export function emailDomain(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return email.toLowerCase();
  return email.slice(at + 1).toLowerCase();
}
