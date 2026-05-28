export const fmtKsh = (n: number) => `KSh ${n.toLocaleString()}`;
export const fmtKshShort = (n: number) => {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `KSh ${(n / 1_000).toFixed(1)}k`;
  return `KSh ${n}`;
};
export const fmtNum  = (n: number) => n.toLocaleString();
export const fmtPct  = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const initials = (name: string) =>
  name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
