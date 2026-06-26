import type { NextFunction, Request, Response } from "express";
import { AppError, unauthorized } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/crypto.js";
import { getRedis, isRedisReady } from "../lib/redis.js";
import { hashToken } from "../utils/crypto.js";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    const token = header.slice(7);
    const redis = getRedis();
    if (isRedisReady()) {
      const blacklisted = await redis.get(`bl:${hashToken(token)}`);
      if (blacklisted) throw unauthorized("Session revoked");
    }
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : unauthorized("Invalid token"));
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(unauthorized("Insufficient role"));
    next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      /* ignore */
    }
  }
  next();
}
