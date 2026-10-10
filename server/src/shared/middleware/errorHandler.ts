import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodSchema } from "zod";
import { AppError, badRequest } from "../utils/errors.js";
import { logger } from "../lib/logger.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest("Validation failed", err.flatten()));
      } else next(err);
    }
  };
}

/** JSON 404 for unknown routes — mounted after all routers. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} does not exist` },
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // body-parser: malformed JSON and oversized payloads are client errors, not 500s
  const httpErr = err as { type?: string; status?: number; code?: string; message?: string };
  if (httpErr?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Malformed JSON body" } });
  }
  if (httpErr?.type === "entity.too.large" || httpErr?.status === 413) {
    return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" } });
  }
  // multer upload limits
  if (httpErr?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: { code: "FILE_TOO_LARGE", message: "Uploaded file exceeds the size limit" } });
  }
  // CORS rejection surfaced as a plain Error by the cors middleware
  if (err instanceof Error && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({ error: { code: "CORS_FORBIDDEN", message: "Origin not allowed" } });
  }

  // Prisma known request errors: map the common ones instead of leaking a 500
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "A record with this value already exists" } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found" } });
    }
    if (err.code === "P2023") {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Malformed identifier" } });
    }
  }

  logger.error(`unhandled error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}
