import { create } from "zustand";
import type { SyncItem } from "@/lib/types";
import { SYNC_QUEUE } from "@/lib/mockData";

type SyncState = {
  online: boolean;
  queue: SyncItem[];
  setOnline: (v: boolean) => void;
  enqueue: (item: Omit<SyncItem, "id" | "status" | "createdAt">) => void;
  syncAll: () => { synced: number; conflicts: number };
  retry: (id: string) => void;
  resolve: (id: string, choice: "mine" | "server") => void;
  remove: (id: string) => void;
};

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export const useSync = create<SyncState>((set, get) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  queue: SYNC_QUEUE,
  setOnline: (v) => set({ online: v }),
  enqueue: (item) =>
    set({
      queue: [
        ...get().queue,
        { ...item, id: `SQ${Date.now()}`, status: "pending", createdAt: stamp() },
      ],
    }),
  syncAll: () => {
    if (!get().online) return { synced: 0, conflicts: 0 };
    let synced = 0;
    let conflicts = 0;
    const next = get().queue.map((q) => {
      if (q.status !== "pending") return q;
      // Simulate ~15% conflict rate deterministically by id length
      const conflict = q.id.length % 7 === 0;
      if (conflict) {
        conflicts++;
        return { ...q, status: "conflict" as const };
      }
      synced++;
      return { ...q, status: "synced" as const };
    });
    set({ queue: next });
    return { synced, conflicts };
  },
  retry: (id) =>
    set({
      queue: get().queue.map((q) => (q.id === id ? { ...q, status: "pending" as const } : q)),
    }),
  resolve: (id, _choice) =>
    set({
      queue: get().queue.map((q) => (q.id === id ? { ...q, status: "synced" as const } : q)),
    }),
  remove: (id) => set({ queue: get().queue.filter((q) => q.id !== id) }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => useSync.getState().setOnline(true));
  window.addEventListener("offline", () => useSync.getState().setOnline(false));
}
