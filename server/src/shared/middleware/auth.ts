import type { NextFunction, Request, Response } from "express";
import { AppError, forbidden, unauthorized } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/crypto.js";
import { getRedis, isRedisReady } from "../lib/redis.js";
import { hashToken } from "../utils/crypto.js";

async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!isRedisReady()) return false;
  const blacklisted = await getRedis().get(`bl:${hashToken(token)}`);
  return Boolean(blacklisted);
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    const token = header.slice(7);
    if (await isTokenBlacklisted(token)) throw unauthorized("Session revoked");
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : unauthorized("Invalid token"));
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    // Authenticated but lacking the role is an authorization failure: 403, not 401.
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient role"));
    next();
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      if (!(await isTokenBlacklisted(token))) {
        req.user = verifyAccessToken(token);
      }
    } catch {
      /* ignore */
    }
  }
  next();
}
