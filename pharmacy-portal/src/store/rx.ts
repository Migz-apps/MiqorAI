import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapInventoryItem, mapPrescription } from "@/lib/api/mappers";
import type { Rx, StockItem } from "@/lib/types";

export const pharmacyKeys = {
  all: ["pharmacy"] as const,
  dashboard: () => [...pharmacyKeys.all, "dashboard"] as const,
  prescriptions: (params?: Record<string, string>) =>
    [...pharmacyKeys.all, "prescriptions", params ?? {}] as const,
  prescription: (id: string) => [...pharmacyKeys.all, "prescription", id] as const,
  inventory: () => [...pharmacyKeys.all, "inventory"] as const,
  patients: () => [...pharmacyKeys.all, "patients"] as const,
  patient: (id: string) => [...pharmacyKeys.all, "patient", id] as const,
  patientAdherence: (id: string) => [...pharmacyKeys.all, "patient-adherence", id] as const,
  adherence: () => [...pharmacyKeys.all, "adherence"] as const,
  reports: () => [...pharmacyKeys.all, "reports"] as const,
  staff: () => [...pharmacyKeys.all, "staff"] as const,
  auditLogs: () => [...pharmacyKeys.all, "audit-logs"] as const,
  billing: () => [...pharmacyKeys.all, "billing"] as const,
  settings: () => [...pharmacyKeys.all, "settings"] as const,
};

export async function loadPrescriptions(params?: Record<string, string>): Promise<Rx[]> {
  const res = await pharmacyApi.prescriptions({ limit: "200", ...params });
  return (res.items as Parameters<typeof mapPrescription>[0][]).map(mapPrescription);
}

export async function loadPrescription(id: string): Promise<Rx> {
  const data = await pharmacyApi.prescription(id);
  return mapPrescription(data as Parameters<typeof mapPrescription>[0]);
}

export async function loadInventory(): Promise<StockItem[]> {
  const res = await pharmacyApi.inventory({ limit: "500" });
  return (res.items as Parameters<typeof mapInventoryItem>[0][]).map(mapInventoryItem);
}

export async function verifyRx(id: string) {
  return pharmacyApi.verifyPrescription(id);
}

export async function readyRx(id: string) {
  return pharmacyApi.readyPrescription(id);
}

export async function holdRx(id: string, reason: string, notes?: string) {
  return pharmacyApi.holdPrescription(id, reason, notes);
}

export async function rejectRx(id: string, reason: string, notes?: string) {
  return pharmacyApi.rejectPrescription(id, reason, notes);
}

export async function dispenseRx(
  id: string,
  dispensedBy: string,
  items: Array<{ drug_id: string; quantity: number }>,
) {
  return pharmacyApi.dispensePrescription(id, { dispensed_by: dispensedBy, items });
}

export async function adjustInventoryStock(drugId: string, adjustment: number, reason: string) {
  return pharmacyApi.adjustInventory({ drug_id: drugId, adjustment, reason });
}
