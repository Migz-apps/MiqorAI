import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { auditMiddleware } from "./shared/middleware/audit.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler.js";
import { apiRateLimiter } from "./shared/middleware/rateLimit.js";
import { authRoutes } from "./modules/identity/index.js";
import { hospitalRoutes, scanRoutes, aiRoutes, clinicalSafetyRoutes } from "./modules/clinical/index.js";
import { patientRoutes } from "./modules/patient/index.js";
import { pharmacyRoutes } from "./modules/pharmacy/index.js";
import { insurerRoutes } from "./modules/financing/index.js";
import { adminRoutes, onboardingRoutes, syncRoutes } from "./modules/platform/index.js";
import filesRoutes from "./shared/routes/files.routes.js";
import referenceRoutes from "./shared/routes/reference.routes.js";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set(config.corsOrigins.filter(Boolean));

  const isTrustedHostedOrigin = (origin: string): boolean => {
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") {
        return false;
      }

      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".vercel.app") ||
        host.endsWith(".onrender.com") ||
        host.endsWith(".hf.space")
      );
    } catch {
      return false;
    }
  };

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.has(origin) || isTrustedHostedOrigin(origin)) {
          callback(null, origin);
          return;
        }

        callback(new Error(`CORS blocked for origin ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(apiRateLimiter);
  app.use(auditMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/patient", patientRoutes);
  app.use("/api/hospital", hospitalRoutes);
  app.use("/api/pharmacy", pharmacyRoutes);
  app.use("/api/insurer", insurerRoutes);
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
