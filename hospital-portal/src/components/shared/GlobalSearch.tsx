import { createContext, useContext, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { PATIENTS } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const SearchCtx = createContext<Ctx>({ open: false, setOpen: () => {} });

export const GlobalSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => { setOpen(false); nav(path); };

  return (
    <SearchCtx.Provider value={{ open, setOpen }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search patients, ID, phone, national ID…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Patients">
            {PATIENTS.slice(0, 50).map(p => (
              <CommandItem key={p.id} value={`${p.name} ${p.id} ${p.phone} ${p.nationalId || ""}`} onSelect={() => go(`/patients/${p.id}`)}>
                <div className="flex items-center gap-sm w-full">
                  <div className="h-7 w-7 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                    {p.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-text-secondary truncate">{p.id} · {p.phone}</div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/dashboard")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => go("/patients")}>Patients</CommandItem>
            <CommandItem onSelect={() => go("/waitlist")}>Waitlist</CommandItem>
            <CommandItem onSelect={() => go("/checkin")}>Check-in</CommandItem>
            <CommandItem onSelect={() => go("/settings")}>Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SearchCtx.Provider>
  );
};

export const GlobalSearchTrigger = () => {
  const { setOpen } = useContext(SearchCtx);
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  return (
    <Button variant="outline" size="sm" className="h-9 gap-2 text-text-secondary font-normal" onClick={() => setOpen(true)}>
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search…</span>
      <kbd className="hidden lg:inline ml-1 text-[10px] border rounded px-1 py-0.5">{isMac ? "⌘" : "Ctrl"} K</kbd>
    </Button>
  );
};
