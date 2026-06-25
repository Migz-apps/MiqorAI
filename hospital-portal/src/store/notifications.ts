import { create } from "zustand";
import type { Notification, Role } from "@/lib/types";
import { hospitalApi } from "@/lib/api/hospital";
import { mapNotification } from "@/lib/mappers";

type NotifState = {
  items: Notification[];
  loading: boolean;
  load: () => Promise<void>;
  unreadFor: (role: Role) => number;
  forRole: (role: Role) => Notification[];
  markRead: (id: string) => Promise<void>;
  markAllRead: (role: Role) => Promise<void>;
  push: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
};

export const useNotifications = create<NotifState>((set, get) => ({
  items: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const rows = await hospitalApi.notifications();
      set({ items: (rows as Record<string, unknown>[]).map(mapNotification) });
    } catch {
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },
  forRole: (role) => get().items.filter(n => n.audience.includes(role)),
  unreadFor: (role) => get().items.filter(n => n.audience.includes(role) && !n.read).length,
  markRead: async (id) => {
    await hospitalApi.markNotificationRead(id).catch(() => undefined);
    set({ items: get().items.map(n => n.id === id ? { ...n, read: true } : n) });
  },
  markAllRead: async (_role) => {
    await hospitalApi.markAllNotificationsRead().catch(() => undefined);
    set({ items: get().items.map(n => ({ ...n, read: true })) });
  },
  push: (n) => set({
    items: [{ ...n, id: `N${Date.now()}`, createdAt: new Date().toISOString().slice(0, 16).replace("T", " "), read: false }, ...get().items],
  }),
}));
