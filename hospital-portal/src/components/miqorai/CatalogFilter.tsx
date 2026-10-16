import { useEffect, useId, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@miqorai/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@miqorai/ui/command";
import { cn } from "@miqorai/ui/utils";
import type { CatalogPage, CatalogSearch } from "@/lib/api/hospital";

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

export type CatalogOption = { value: string; label: string; hint?: string };

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type Props = {
  label: string;
  /** Selected option value, or "any". */
  value: string;
  onChange: (value: string) => void;
  queryKey: readonly unknown[];
  fetchPage: (search: CatalogSearch) => Promise<CatalogPage>;
  toOption: (row: Record<string, unknown>) => CatalogOption;
  placeholder: string;
};

/**
 * Server-searched filter list: the catalog is queried as the user types
 * (debounced), shows "N of total" and loads further pages on demand, so every
 * entry is reachable rather than only the first page.
 */
export function CatalogFilter({ label, value, onChange, queryKey, fetchPage, toOption, placeholder }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), DEBOUNCE_MS);

  const query = useInfiniteQuery({
    queryKey: [...queryKey, q],
    queryFn: ({ pageParam }) => fetchPage({ q, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.has_more ? last.offset + last.items.length : undefined),
    enabled: open,
  });

  const options = (query.data?.pages ?? []).flatMap((p) => p.items.map(toOption));
  const total = query.data?.pages.at(-1)?.total ?? 0;
  const searching = query.isFetching && !query.isFetchingNextPage;

  // Move focus into the search box when the list opens (keyboard users land on it).
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="space-y-xs">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${value === "any" ? "Any" : value}`}
        className="w-full justify-between font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{value === "any" ? "Any" : value}</span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
      </Button>
      {open && (
        <Command shouldFilter={false} className="rounded-md border" id={listId}>
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
            aria-label={`Search ${label.toLowerCase()}`}
          />
          <CommandList className="max-h-56">
            <CommandGroup>
              <CommandItem value="__any" onSelect={() => pick("any")}>
                <Check className={cn("mr-2 h-4 w-4", value === "any" ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                Any
              </CommandItem>
              {options.map((o) => (
                <CommandItem key={`${o.value}-${o.hint ?? ""}`} value={`${o.value}::${o.hint ?? ""}`} onSelect={() => pick(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {searching && (
              <div className="flex items-center gap-xs px-sm py-xs text-xs text-text-secondary" role="status">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Searching…
              </div>
            )}
            {query.isError && (
              <div className="px-sm py-xs text-xs text-error" role="alert">Could not load the catalog.</div>
            )}
            {!searching && !query.isError && query.isSuccess && options.length === 0 && (
              <div className="px-sm py-xs text-xs text-text-secondary">No matches.</div>
            )}
          </CommandList>
          {query.isSuccess && (
            <div className="flex items-center justify-between border-t px-sm py-xs text-xs text-text-secondary">
              <span aria-live="polite">
                {options.length} of {total}
              </span>
              {query.hasNextPage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              )}
            </div>
          )}
        </Command>
      )}
    </div>
  );
}
