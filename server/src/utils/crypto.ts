import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string | null;
  organizationType?: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpires as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpires as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, config.jwtRefreshSecret) as { sub: string; type?: string };
  return { sub: decoded.sub };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verify, "hex"));
}

export function encryptText(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(config.encryptionKey, "miqorai-salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptText(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) return stored;
  const key = crypto.scryptSync(config.encryptionKey, "miqorai-salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
