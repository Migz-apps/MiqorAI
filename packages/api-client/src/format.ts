/**
 * One locale, one time zone and one currency for every portal.
 *
 * The platform serves Rwanda: dates and times always render in Africa/Kigali
 * (whatever the browser's zone), money defaults to RWF, and the locale is
 * en-RW, falling back to en-GB on runtimes whose Intl data lacks it.
 */

export const PLATFORM_TIME_ZONE = "Africa/Kigali";
export const DEFAULT_CURRENCY = "RWF";

function resolveLocale(): string {
  try {
    if (Intl.DateTimeFormat.supportedLocalesOf(["en-RW"]).length > 0) return "en-RW";
  } catch {
    // Fall through to the fallback below.
  }
  return "en-GB";
}

export const PLATFORM_LOCALE = resolveLocale();

export type DateInput = string | number | Date | null | undefined;

const EMPTY = "—";

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Intl formatters are costly to build; reuse one per option set.
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(PLATFORM_LOCALE, { ...options, timeZone: PLATFORM_TIME_ZONE });
    dateFormatters.set(key, f);
  }
  return f;
}

function formatWith(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  return d ? dateFormatter(options).format(d) : EMPTY;
}

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

/** "16 Oct 2026". Pass options to change the fields (e.g. add weekday). */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions = DATE): string {
  return formatWith(value, options);
}

/** "16 Oct 2026, 14:05". */
export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { ...DATE, ...TIME },
): string {
  return formatWith(value, { hourCycle: "h23", ...options });
}

/** "14:05" (24-hour). */
export function formatTime(value: DateInput, options: Intl.DateTimeFormatOptions = TIME): string {
  return formatWith(value, { hourCycle: "h23", ...options });
}

/** The Kigali calendar day as "YYYY-MM-DD", for API date parameters. */
export function formatIsoDate(value: DateInput = new Date()): string {
  const d = toDate(value);
  if (!d) return "";
  const parts = dateFormatter({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.345],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

/** "5 minutes ago", "yesterday", "in 3 days"; "just now" under a minute. */
export function formatRelative(
  value: DateInput,
  { now = Date.now(), style = "long" }: { now?: number | Date; style?: Intl.RelativeTimeFormatStyle } = {},
): string {
  const d = toDate(value);
  if (!d) return EMPTY;
  let delta = (d.getTime() - (now instanceof Date ? now.getTime() : now)) / 1000;
  if (Math.abs(delta) < 60) return "just now";
  let rtf = relativeFormatters.get(style);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(PLATFORM_LOCALE, { numeric: "auto", style });
    relativeFormatters.set(style, rtf);
  }
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return rtf.format(Math.round(delta), unit);
    delta /= size;
  }
  return rtf.format(Math.round(delta), "year");
}

export type MoneyOptions = {
  /** ISO 4217 code; defaults to the platform currency (RWF). */
  currency?: string;
  /** "RWF 1.2M" instead of "RWF 1,234,567". */
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/** "RWF 12,500". Fraction digits follow the currency (none for RWF, 2 for USD). */
export function formatMoney(amount: number | string | null | undefined, options: MoneyOptions = {}): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n === null || n === undefined || !Number.isFinite(n)) return EMPTY;
  const { currency = DEFAULT_CURRENCY, compact = false, ...digits } = options;
  return new Intl.NumberFormat(PLATFORM_LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    ...digits,
  }).format(n);
}

/** Grouped number in the platform locale: "12,500". */
export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat(PLATFORM_LOCALE, options).format(value);
}
