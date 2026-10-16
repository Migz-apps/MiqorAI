import { formatDateTime } from "@miqorai/api-client/format";

export {
  formatDate,
  formatDateTime,
  formatIsoDate,
  formatMoney,
  formatNumber,
  formatRelative,
  formatTime,
} from "@miqorai/api-client/format";

/** Audit-style timestamp in Kigali time: "16/10/2026 14:05:09". */
export function formatTs(date: string | Date) {
  return formatDateTime(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).replace(",", "");
}
