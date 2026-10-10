export function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

/** Parse a ?limit= query value: NaN-safe, floored at 1, capped at `max`. */
export function clampLimit(raw: unknown, def: number, max?: number): number;
export function clampLimit(raw: unknown, def: number | undefined, max?: number): number | undefined;
export function clampLimit(raw: unknown, def: number | undefined, max = 200): number | undefined {
  const n = parseInt(String(raw ?? ""), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, 1), max);
}
