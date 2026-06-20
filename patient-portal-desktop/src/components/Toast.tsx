import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { FiCheckCircle, FiAlertCircle, FiX } from "react-icons/fi";

type T = { id: number; message: string; type: "success" | "error" };
const Ctx = createContext<{ toast: (m: string, t?: "success" | "error") => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, message, type }]);
    setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((i) => (
          <div
            key={i.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg min-w-[280px] ${
              i.type === "success" ? "border-success/30" : "border-destructive/30"
            }`}
          >
            {i.type === "success" ? (
              <FiCheckCircle className="text-success" size={20} />
            ) : (
              <FiAlertCircle className="text-destructive" size={20} />
            )}
            <span className="text-sm flex-1">{i.message}</span>
            <button
              onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
              aria-label="Dismiss"
            >
              <FiX size={16} className="text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside provider");
  return c;
}
