import { ReactNode, useEffect, useId } from "react";
import { FiX } from "react-icons/fi";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizeCls = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    // The backdrop closes on click; keyboard users close with Escape (handled above).
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${sizeCls} rounded-xl bg-card shadow-2xl border border-border`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 id={titleId} className="text-lg font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
