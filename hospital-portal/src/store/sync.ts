import { create } from "zustand";
import type { SyncItem } from "@/lib/types";
import { syncApi } from "@/lib/api/hospital";
import { mapSyncItem } from "@/lib/mappers";

type SyncState = {
  online: boolean;
  queue: SyncItem[];
  loading: boolean;
  load: () => Promise<void>;
  setOnline: (v: boolean) => void;
  enqueue: (item: Omit<SyncItem, "id" | "status" | "createdAt">) => void;
  syncAll: () => Promise<{ synced: number; conflicts: number }>;
  retry: (id: string) => Promise<void>;
  resolve: (id: string, choice: "mine" | "server") => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export const useSync = create<SyncState>((set, get) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  queue: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const { items } = await syncApi.queue();
      set({ queue: items.map(i => mapSyncItem(i as Record<string, unknown>)) });
    } catch {
      set({ queue: [] });
    } finally {
      set({ loading: false });
    }
  },
  setOnline: (v) => set({ online: v }),
  enqueue: (item) =>
    set({
      queue: [
        ...get().queue,
        { ...item, id: `SQ${Date.now()}`, status: "pending", createdAt: stamp() },
      ],
    }),
  syncAll: async () => {
    if (!get().online) return { synced: 0, conflicts: 0 };
    const pending = get().queue.filter(q => q.status === "pending");
    let synced = 0;
    let conflicts = 0;
    for (const item of pending) {
      try {
        const res = await syncApi.process(item.id) as { status?: string };
        if (res.status === "conflict") conflicts++;
        else synced++;
      } catch {
        conflicts++;
      }
    }
    await get().load();
    return { synced, conflicts };
  },
  retry: async (id) => {
    await syncApi.process(id).catch(() => undefined);
    await get().load();
  },
  resolve: async (id, choice) => {
    await syncApi.resolve(id, choice === "mine" ? "client" : "server").catch(() => undefined);
    await get().load();
  },
  remove: async (id) => {
    await syncApi.delete(id).catch(() => undefined);
    set({ queue: get().queue.filter(q => q.id !== id) });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => useSync.getState().setOnline(true));
  window.addEventListener("offline", () => useSync.getState().setOnline(false));
}
