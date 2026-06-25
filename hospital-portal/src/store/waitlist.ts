import { create } from "zustand";
import type { WaitlistEntry, Priority, Department } from "@/lib/types";
import { hospitalApi } from "@/lib/api/hospital";
import { mapCheckinToWaitlistEntry, mapVisitStatusToApi } from "@/lib/mappers";

type WaitState = {
  entries: WaitlistEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  add: (e: Omit<WaitlistEntry, "id" | "checkInTimestamp" | "checkInTime"> & { checkInTimestamp?: number }) => Promise<WaitlistEntry>;
  setStatus: (id: string, status: WaitlistEntry["status"]) => Promise<void>;
  assign: (id: string, staffUserId: string, staffName?: string) => Promise<void>;
  setPriority: (id: string, p: Priority) => Promise<void>;
  remove: (id: string) => void;
  filterDept: (d?: Department) => WaitlistEntry[];
};

export const useWaitlist = create<WaitState>((set, get) => ({
  entries: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const data = await hospitalApi.checkinsToday() as { patients?: Record<string, unknown>[] };
      const entries = (data.patients ?? []).map(mapCheckinToWaitlistEntry);
      set({ entries });
    } catch {
      set({ entries: [] });
    } finally {
      set({ loading: false });
    }
  },
  add: async (e) => {
    const res = await hospitalApi.checkin({
      patient_id: e.patientId,
      department: e.department,
      priority: e.priority,
    }) as { visit_id: string; checkin_time?: string };
    await get().refresh();
    const entry = get().entries.find(x => x.id === res.visit_id);
    if (entry) return entry;
    const ts = e.checkInTimestamp ?? Date.now();
    const fallback: WaitlistEntry = {
      ...e,
      id: res.visit_id,
      checkInTimestamp: res.checkin_time ? new Date(res.checkin_time).getTime() : ts,
      checkInTime: res.checkin_time
        ? new Date(res.checkin_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
        : new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
    set({ entries: [fallback, ...get().entries] });
    return fallback;
  },
  setStatus: async (id, status) => {
    await hospitalApi.visitStatus(id, mapVisitStatusToApi(status)).catch(() => undefined);
    set({ entries: get().entries.map(e => e.id === id ? { ...e, status } : e) });
  },
  assign: async (id, staffUserId, staffName) => {
    await hospitalApi.visitAssign(id, staffUserId).catch(() => undefined);
    set({ entries: get().entries.map(e => e.id === id ? { ...e, assignedTo: staffName ?? staffUserId } : e) });
  },
  setPriority: async (id, priority) => {
    await hospitalApi.visitPriority(id, priority).catch(() => undefined);
    set({ entries: get().entries.map(e => e.id === id ? { ...e, priority } : e) });
  },
  remove: (id) => set({ entries: get().entries.filter(e => e.id !== id) }),
  filterDept: (d) => d ? get().entries.filter(e => e.department === d) : get().entries,
}));

export const waitMinutes = (e: WaitlistEntry) =>
  Math.max(0, Math.round((Date.now() - e.checkInTimestamp) / 60000));
