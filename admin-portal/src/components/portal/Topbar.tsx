import { Bell, Command, Search, Settings2 } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="h-full px-4 lg:px-6 flex items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2 h-9 w-72 rounded-md border border-border bg-card/60 px-3 text-sm text-muted-foreground">
          <Search className="size-4" />
          <span className="flex-1">Search anything…</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60 flex items-center gap-1">
            <Command className="size-3" />K
          </kbd>
        </div>
        <button className="relative h-9 w-9 grid place-items-center rounded-md border border-border bg-card/60 hover:bg-accent">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-pink text-pink pulse-dot" />
        </button>
        <button className="h-9 w-9 grid place-items-center rounded-md border border-border bg-card/60 hover:bg-accent">
          <Settings2 className="size-4" />
        </button>
        <div className="hidden md:flex items-center gap-2 h-9 px-2.5 rounded-md border border-success/30 bg-success/10 text-success">
          <span className="size-2 rounded-full bg-success pulse-dot text-success" />
          <span className="text-xs font-mono">LIVE</span>
        </div>
      </div>
    </header>
  );
}
