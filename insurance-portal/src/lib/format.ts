export {
  formatDate,
  formatDateTime,
  formatIsoDate,
  formatMoney,
  formatNumber,
} from "@miqorai/api-client/format";

export const fmtPct  = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
export const initials = (name: string) =>
  name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
