import { config } from "../config.js";

export type PortalTarget = "patient" | "hospital" | "insurance" | "pharmacy" | "admin";

export function getPortalUrl(target: PortalTarget): string {
  return config.portalUrls[target];
}

export function buildPortalUrl(target: PortalTarget, path: string): string {
  const base = getPortalUrl(target);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
