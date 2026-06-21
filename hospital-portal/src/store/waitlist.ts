import { create } from "zustand";
import type { WaitlistEntry, Priority, Department } from "@/lib/types";
import { INITIAL_WAITLIST } from "@/lib/mockData";

type WaitState = {
  entries: WaitlistEntry[];
  add: (e: Omit<WaitlistEntry, "id" | "checkInTimestamp" | "checkInTime"> & { checkInTimestamp?: number }) => WaitlistEntry;
  setStatus: (id: string, status: WaitlistEntry["status"]) => void;
  assign: (id: string, staff: string) => void;
  setPriority: (id: string, p: Priority) => void;
  remove: (id: string) => void;
  filterDept: (d?: Department) => WaitlistEntry[];
};

const fmtHHMM = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export const useWaitlist = create<WaitState>((set, get) => ({
  entries: INITIAL_WAITLIST,
  add: (e) => {
    const ts = e.checkInTimestamp ?? Date.now();
    const entry: WaitlistEntry = {
      ...e,
      id: `W${Date.now()}`,
      checkInTimestamp: ts,
      checkInTime: fmtHHMM(ts),
    };
    set({ entries: [entry, ...get().entries] });
    return entry;
  },
  setStatus: (id, status) =>
    set({ entries: get().entries.map(e => e.id === id ? { ...e, status } : e) }),
  assign: (id, staff) =>
    set({ entries: get().entries.map(e => e.id === id ? { ...e, assignedTo: staff } : e) }),
  setPriority: (id, priority) =>
    set({ entries: get().entries.map(e => e.id === id ? { ...e, priority } : e) }),
  remove: (id) => set({ entries: get().entries.filter(e => e.id !== id) }),
  filterDept: (d) => d ? get().entries.filter(e => e.department === d) : get().entries,
}));

export const waitMinutes = (e: WaitlistEntry) =>
  Math.max(0, Math.round((Date.now() - e.checkInTimestamp) / 60000));
