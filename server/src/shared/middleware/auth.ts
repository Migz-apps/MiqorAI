import type { NextFunction, Request, Response } from "express";
import { AppError, forbidden, unauthorized } from "../utils/errors.js";
import { verifyAccessToken, type TokenPayload } from "../utils/crypto.js";
import { getRedis, isRedisReady } from "../lib/redis.js";
import { hashToken } from "../utils/crypto.js";
import { prisma } from "../lib/prisma.js";
import { isAllowedOrigin } from "../utils/origins.js";

const USER_ACTIVE_TTL_SECONDS = 60;

async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!isRedisReady()) return false;
  const blacklisted = await getRedis().get(`bl:${hashToken(token)}`);
  return Boolean(blacklisted);
}

function userActiveKey(userId: string): string {
  return `ua:${userId}`;
}

/** Cached isActive lookup: one Redis read on the hot path, falling back to a
 * direct DB read on a cache miss or when Redis is unavailable. */
async function isUserActive(userId: string): Promise<boolean> {
  if (isRedisReady()) {
    const cached = await getRedis()
      .get(userActiveKey(userId))
      .catch(() => null);
    if (cached !== null) return cached === "1";
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  const active = user?.isActive === true;
  if (isRedisReady()) {
    await getRedis()
      .setex(userActiveKey(userId), USER_ACTIVE_TTL_SECONDS, active ? "1" : "0")
      .catch(() => undefined);
  }
  return active;
}

/** Drops the cached isActive flag so a deactivation takes effect immediately. */
export async function invalidateUserActiveCache(userId: string): Promise<void> {
  if (!isRedisReady()) return;
  await getRedis()
    .del(userActiveKey(userId))
    .catch(() => undefined);
}

/** Verifies a request's access token once per request: the global rate limiter
 * verifies it to key by user, and authenticate/optionalAuth reuse that result.
 * Throws like verifyAccessToken. */
export function verifyRequestAccessToken(req: Request, token: string): TokenPayload {
  const cached = req.verifiedAccessToken;
  if (cached && cached.token === token) return cached.payload;
  const payload = verifyAccessToken(token);
  req.verifiedAccessToken = { token, payload };
  return payload;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    const token = header.slice(7);
    if (await isTokenBlacklisted(token)) throw unauthorized("Session revoked");
    const payload = verifyRequestAccessToken(req, token);
    if (!(await isUserActive(payload.sub))) throw unauthorized("Account inactive");
    req.user = payload;
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
        const payload = verifyRequestAccessToken(req, token);
        if (await isUserActive(payload.sub)) {
          req.user = payload;
        }
      }
    } catch {
      /* ignore */
    }
  }
  next();
}

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF guard for cookie-bearing routes: a state-changing request carrying an
 * Origin header must come from an allowed origin. Requests without an Origin
 * header (mobile apps, server-to-server calls) pass through. */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin || !STATE_CHANGING_METHODS.has(req.method)) return next();
  if (isAllowedOrigin(origin)) return next();
  next(forbidden("Origin not allowed"));
}
