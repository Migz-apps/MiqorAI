import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { auditMiddleware } from "./middleware/audit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.routes.js";
import hospitalRoutes from "./routes/hospital.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import pharmacyRoutes from "./routes/pharmacy.routes.js";
import insurerRoutes from "./routes/insurer.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import scanRoutes from "./routes/scan.routes.js";
import filesRoutes from "./routes/files.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import referenceRoutes from "./routes/reference.routes.js";
import clinicalSafetyRoutes from "./routes/clinical-safety.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
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

  app.use(errorHandler);

  return app;
}
