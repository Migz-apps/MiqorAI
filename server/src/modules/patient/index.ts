/** Patient module public surface: consent (grants/logs) and QR identity. */
export { default as patientRoutes } from "./patient.routes.js";
export * from "./access.service.js";
export { getPatientQrImage, touchPatientData, resolveQrScan, validateQrScan } from "./qr.service.js";
