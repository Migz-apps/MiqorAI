import { create } from "zustand";
import { syncApi } from "@/lib/api/pharmacy";
import { mapSyncItem } from "@/lib/api/mappers";

export const syncKeys = {
  all: ["sync"] as const,
  queue: () => [...syncKeys.all, "queue"] as const,
};

export type SyncItem = {
  id: string;
  type: "dispense" | "stock-adjust" | "verify" | string;
  label: string;
  status: "pending" | "synced" | "failed" | "conflict";
  at: number;
};

type SyncState = {
  online: boolean;
  setOnline: (v: boolean) => void;
};

export const useSync = create<SyncState>((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  setOnline: (v) => set({ online: v }),
}));

export async function loadSyncQueue(): Promise<SyncItem[]> {
  const { items } = await syncApi.queue();
  return (items as Parameters<typeof mapSyncItem>[0][]).map(mapSyncItem);
}

export async function retrySyncItem(id: string) {
  return syncApi.process(id);
}

export async function removeSyncItem(id: string) {
  return syncApi.delete(id);
}

export async function pushSyncItem(
  operation: "create" | "update" | "delete",
  resourceType: string,
  resourceData: Record<string, unknown>,
) {
  return syncApi.push([{ operation, resource_type: resourceType, resource_data: resourceData }]);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => useSync.getState().setOnline(true));
  window.addEventListener("offline", () => useSync.getState().setOnline(false));
}
