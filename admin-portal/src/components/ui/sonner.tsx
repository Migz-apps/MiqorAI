import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    visibleToasts={4}
    closeButton
    richColors={false}
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-sm",
        title: "group-[.toast]:text-sm group-[.toast]:font-medium",
        description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
        success: "group-[.toast]:border-success/30 group-[.toast]:bg-success/5",
        error: "group-[.toast]:border-destructive/30 group-[.toast]:bg-destructive/5",
        warning: "group-[.toast]:border-secondary/40 group-[.toast]:bg-secondary/10",
        info: "group-[.toast]:border-primary/20 group-[.toast]:bg-primary/10",
        closeButton:
          "group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-muted-foreground",
      },
    }}
    {...props}
  />
);

export { Toaster };
