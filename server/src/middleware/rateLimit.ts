import rateLimit from "express-rate-limit";
import { config } from "../config.js";

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: config.rateLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many requests" } },
});
