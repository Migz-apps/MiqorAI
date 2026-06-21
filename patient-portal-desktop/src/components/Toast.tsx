import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from "react-icons/fi";
import { toUserMessage } from "@/lib/user-messages";

type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = { id: number; message: string; type: ToastType };

const Ctx = createContext<{
  toast: (message: string, type?: ToastType) => void;
} | null>(null);

const STYLES: Record<ToastType, { border: string; icon: typeof FiCheckCircle; IconColor: string }> = {
  success: { border: "border-success/30", icon: FiCheckCircle, IconColor: "text-success" },
  error: { border: "border-destructive/30", icon: FiAlertCircle, IconColor: "text-destructive" },
  info: { border: "border-primary/20", icon: FiInfo, IconColor: "text-primary" },
  warning: { border: "border-secondary/40", icon: FiAlertTriangle, IconColor: "text-secondary-foreground" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    const safe = toUserMessage(message);
    setItems((p) => [...p, { id, message: safe, type }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:bottom-6 sm:right-6 sm:px-0"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((i) => {
          const { border, icon: Icon, IconColor } = STYLES[i.type];
          return (
            <div
              key={i.id}
              role="status"
              className={`pointer-events-auto flex animate-in slide-in-from-bottom-2 fade-in items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg ${border}`}
            >
              <Icon className={`mt-0.5 shrink-0 ${IconColor}`} size={18} />
              <span className="flex-1 text-sm leading-5">{i.message}</span>
              <button
                type="button"
                onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
                className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                <FiX size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside provider");
  return c;
}
