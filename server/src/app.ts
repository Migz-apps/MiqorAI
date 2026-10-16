import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { auditMiddleware } from "./shared/middleware/audit.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler.js";
import { apiRateLimiter } from "./shared/middleware/rateLimit.js";
import { isAllowedOrigin } from "./shared/utils/origins.js";
import { authRoutes } from "./modules/identity/index.js";
import { hospitalRoutes, scanRoutes, aiRoutes, clinicalSafetyRoutes } from "./modules/clinical/index.js";
import { patientRoutes } from "./modules/patient/index.js";
import { pharmacyRoutes } from "./modules/pharmacy/index.js";
import { insurerRoutes, partnerRoutes } from "./modules/financing/index.js";
import { adminRoutes, onboardingRoutes, syncRoutes } from "./modules/platform/index.js";
import filesRoutes from "./shared/routes/files.routes.js";
import referenceRoutes from "./shared/routes/reference.routes.js";
import healthRoutes from "./shared/routes/health.routes.js";

export function createApp() {
  const app = express();

  // Production runs behind exactly one proxy hop (Render router or
  // ingress-nginx): trust only that hop (TRUST_PROXY, default 1 in production,
  // off elsewhere), so req.ip is the real client and a spoofed X-Forwarded-For
  // cannot pick its own rate-limit key.
  app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (isAllowedOrigin(origin)) {
          callback(null, origin);
          return;
        }

        callback(new Error(`CORS blocked for origin ${origin}`));
      },
      credentials: true,
      exposedHeaders: ["X-Total-Count", "X-Limit", "X-Offset", "Retry-After"],
    }),
  );
  // Probes: /health/live (liveness, no dependencies), /health/ready and /health
  // (readiness: DB + Redis). Mounted before the rate limiter so frequent
  // platform probes never consume client quota.
  app.use("/health", healthRoutes);

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(apiRateLimiter);
  app.use(auditMiddleware);

  app.use("/api/auth", authRoutes);
  app.use("/api/patient", patientRoutes);
  app.use("/api/hospital", hospitalRoutes);
  app.use("/api/pharmacy", pharmacyRoutes);
  app.use("/api/insurer", insurerRoutes);
  app.use("/api/partner/v1", partnerRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/scan", scanRoutes);
  app.use("/api/files", filesRoutes);
  app.use("/api/sync", syncRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/reference", referenceRoutes);
  app.use("/api/v1/clinical-safety", clinicalSafetyRoutes);
  app.use("/api/ai", aiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
