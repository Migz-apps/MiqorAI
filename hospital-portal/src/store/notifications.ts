import { create } from "zustand";
import type { Notification, Role } from "@/lib/types";
import { NOTIFICATIONS } from "@/lib/mockData";

type NotifState = {
  items: Notification[];
  unreadFor: (role: Role) => number;
  forRole: (role: Role) => Notification[];
  markRead: (id: string) => void;
  markAllRead: (role: Role) => void;
  push: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
};

export const useNotifications = create<NotifState>((set, get) => ({
  items: NOTIFICATIONS,
  forRole: (role) => get().items.filter(n => n.audience.includes(role)),
  unreadFor: (role) => get().items.filter(n => n.audience.includes(role) && !n.read).length,
  markRead: (id) => set({ items: get().items.map(n => n.id === id ? { ...n, read: true } : n) }),
  markAllRead: (role) => set({
    items: get().items.map(n => n.audience.includes(role) ? { ...n, read: true } : n),
  }),
  push: (n) => set({
    items: [{ ...n, id: `N${Date.now()}`, createdAt: new Date().toISOString().slice(0,16).replace("T"," "), read: false }, ...get().items],
  }),
}));
