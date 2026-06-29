import { useQuery } from "@tanstack/react-query";
import { mapPrescription, mapInventoryItem, mapPatientDetail, mapPatientListItem, mapStaffMember, mapAdherenceTrend, mapRevenueTrend } from "./mappers";
import type { ApiPrescription } from "./mappers";
import { pharmacyApi } from "./pharmacy";

export const pharmacyKeys = {
  dashboard: ["pharmacy", "dashboard"] as const,
  prescriptions: ["pharmacy", "prescriptions"] as const,
  prescription: (id: string) => ["pharmacy", "prescription", id] as const,
  inventory: ["pharmacy", "inventory"] as const,
  patients: ["pharmacy", "patients"] as const,
  patient: (id: string) => ["pharmacy", "patient", id] as const,
  patientAdherence: (id: string) => ["pharmacy", "patient-adherence", id] as const,
  adherence: ["pharmacy", "adherence"] as const,
  reports: ["pharmacy", "reports"] as const,
  auditLogs: ["pharmacy", "audit-logs"] as const,
  staff: ["pharmacy", "staff"] as const,
  settings: ["pharmacy", "settings"] as const,
  billingReceipts: ["pharmacy", "billing-receipts"] as const,
  syncQueue: ["sync", "queue"] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: pharmacyKeys.dashboard,
    queryFn: () => pharmacyApi.dashboard(),
  });
}

export function usePrescriptions() {
  return useQuery({
    queryKey: pharmacyKeys.prescriptions,
    queryFn: async () => {
      const data = await pharmacyApi.prescriptions();
      return (data.items as Parameters<typeof mapPrescription>[0][]).map(mapPrescription);
    },
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: pharmacyKeys.prescription(id ?? ""),
    queryFn: async () => {
      const raw = await pharmacyApi.prescription(id!) as ApiPrescription & {
        patient?: { phone?: string; date_of_birth?: string };
        allergies?: unknown[];
        interactions?: { interactions?: Array<{ note?: string }> };
      };
      const mapped = mapPrescription({
        ...raw,
        patient: raw.patient,
        allergies: raw.allergies,
      });
      const interactionMessages =
        raw.interactions?.interactions?.map((i) => i.note ?? "").filter(Boolean) ?? [];
      return { ...mapped, interactionMessages };
    },
    enabled: !!id,
  });
}

export function useInventory() {
  return useQuery({
    queryKey: pharmacyKeys.inventory,
    queryFn: async () => {
      const data = await pharmacyApi.inventory();
      return (data.items as Parameters<typeof mapInventoryItem>[0][]).map(mapInventoryItem);
    },
  });
}

export function usePatients() {
  return useQuery({
    queryKey: pharmacyKeys.patients,
    queryFn: async () => {
      const data = await pharmacyApi.patients();
      return (data as Array<{ id: string; name: string; phone?: string; email?: string }>).map(mapPatientListItem);
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: pharmacyKeys.patient(id ?? ""),
    queryFn: async () => {
      const [patient, adherence] = await Promise.all([
        pharmacyApi.patient(id!),
        pharmacyApi.patientAdherence(id!).catch(() => null),
      ]);
      return {
        patient: mapPatientDetail(
          patient as Parameters<typeof mapPatientDetail>[0],
          adherence as { overall_rate?: number } | undefined,
        ),
        raw: patient,
        adherenceHistory: await pharmacyApi.patientAdherenceHistory(id!).catch(() => []),
      };
    },
    enabled: !!id,
  });
}

export function useAdherence() {
  return useQuery({
    queryKey: pharmacyKeys.adherence,
    queryFn: async () => {
      const data = await pharmacyApi.adherence();
      const buckets = data.buckets as Record<string, number> | undefined;
      const trend = mapAdherenceTrend((data.trend as Parameters<typeof mapAdherenceTrend>[0]) ?? []);
      return { buckets, trend };
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: pharmacyKeys.reports,
    queryFn: async () => {
      const data = await pharmacyApi.reports();
      return {
        revenue: Number(data.revenue ?? 0),
        dispenseCount: Number(data.dispense_count ?? 0),
        adherenceAverage: Number(data.adherence_average ?? 0),
        trend: mapRevenueTrend((data.trend as Parameters<typeof mapRevenueTrend>[0]) ?? []),
      };
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: pharmacyKeys.auditLogs,
    queryFn: async () => {
      const data = await pharmacyApi.auditLogs();
      return data.items as Array<{
        id: string;
        action: string;
        userEmail?: string | null;
        success?: boolean;
        createdAt: string;
      }>;
    },
  });
}

export function useStaff() {
  return useQuery({
    queryKey: pharmacyKeys.staff,
    queryFn: async () => {
      const data = await pharmacyApi.staff();
      return (data as Parameters<typeof mapStaffMember>[0][]).map(mapStaffMember);
    },
  });
}

export function usePharmacySettings() {
  return useQuery({
    queryKey: pharmacyKeys.settings,
    queryFn: () => pharmacyApi.settings(),
  });
}

export function useBillingReceipts() {
  return useQuery({
    queryKey: pharmacyKeys.billingReceipts,
    queryFn: async () => {
      const data = await pharmacyApi.billingReceipts();
      return data as Array<{
        id: string;
        patient_name: string;
        dispensed_at?: string;
        total: number;
        payment_type: string;
      }>;
    },
  });
}
