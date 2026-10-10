/** Identity module public surface (ADR-001). Other modules import from here only. */
export { default as authRoutes } from "./auth.routes.js";
export * from "./session.service.js";
export * from "./lockout.service.js";
export * from "./staff.service.js";
