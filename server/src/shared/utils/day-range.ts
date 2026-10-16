/**
 * Calendar boundaries ("today", "this week", "this month") in the platform
 * timezone (PLATFORM_TIMEZONE, default Africa/Kigali) rather than the server's
 * local zone, which is UTC on hosted deployments. Uses Intl only.
 */
import { config } from "../../config.js";

export interface DayRange {
  /** Inclusive start instant. */
  start: Date;
  /** Exclusive end instant (start of the next period). */
  end: Date;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const formatters = new Map<string, Intl.DateTimeFormat>();
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

/** Throws a RangeError for an unknown IANA zone name. */
export function assertValidTimeZone(timeZone: string): void {
  formatter(timeZone);
}

export function platformTimeZone(): string {
  return config.platformTimezone;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(timeZone).formatToParts(instant)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday ?? "Mon"] ?? 1,
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** UTC instant of a wall-clock midnight in `timeZone`. Day overflow (e.g. day 32)
 * rolls over like Date.UTC. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

/** The calendar day containing `at`. */
export function dayRange(at: Date = new Date(), timeZone = platformTimeZone()): DayRange {
  const p = zonedParts(at, timeZone);
  return {
    start: zonedMidnight(p.year, p.month, p.day, timeZone),
    end: zonedMidnight(p.year, p.month, p.day + 1, timeZone),
  };
}

export function startOfDay(at: Date = new Date(), timeZone = platformTimeZone()): Date {
  return dayRange(at, timeZone).start;
}

/** The ISO week (Monday start) containing `at`. */
export function weekRange(at: Date = new Date(), timeZone = platformTimeZone()): DayRange {
  const p = zonedParts(at, timeZone);
  const mondayDay = p.day - (p.weekday - 1);
  return {
    start: zonedMidnight(p.year, p.month, mondayDay, timeZone),
    end: zonedMidnight(p.year, p.month, mondayDay + 7, timeZone),
  };
}

/** The calendar month containing `at`. */
export function monthRange(at: Date = new Date(), timeZone = platformTimeZone()): DayRange {
  const p = zonedParts(at, timeZone);
  return {
    start: zonedMidnight(p.year, p.month, 1, timeZone),
    end: zonedMidnight(p.year, p.month + 1, 1, timeZone),
  };
}

export function startOfMonth(at: Date = new Date(), timeZone = platformTimeZone()): Date {
  return monthRange(at, timeZone).start;
}

/** "YYYY-MM-DD" of `at` in the platform timezone. */
export function dateKey(at: Date, timeZone = platformTimeZone()): string {
  const p = zonedParts(at, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "YYYY-MM" of `at` in the platform timezone. */
export function monthKey(at: Date, timeZone = platformTimeZone()): string {
  return dateKey(at, timeZone).slice(0, 7);
}

/** "YYYY-MM" keys for the `count` months ending with the month containing `at`. */
export function recentMonthKeys(count: number, at: Date = new Date(), timeZone = platformTimeZone()): string[] {
  const p = zonedParts(at, timeZone);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(p.year, p.month - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Day named by a query value: "YYYY-MM-DD" is a platform-timezone calendar day;
 * any other parseable value selects the day containing that instant; no value
 * means today. */
export function dayRangeFor(value: string | undefined, timeZone = platformTimeZone()): DayRange {
  if (!value) return dayRange(new Date(), timeZone);
  const m = DATE_ONLY.exec(value.trim());
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return {
      start: zonedMidnight(y, mo, d, timeZone),
      end: zonedMidnight(y, mo, d + 1, timeZone),
    };
  }
  return dayRange(new Date(value), timeZone);
}

/** Start bound of a user-supplied range: a date-only value means the start of that day. */
export function rangeStart(value: string, timeZone = platformTimeZone()): Date {
  return DATE_ONLY.test(value.trim()) ? dayRangeFor(value, timeZone).start : new Date(value);
}

/** Inclusive end bound of a user-supplied range: a date-only value covers the whole day. */
export function rangeEnd(value: string, timeZone = platformTimeZone()): Date {
  return DATE_ONLY.test(value.trim())
    ? new Date(dayRangeFor(value, timeZone).end.getTime() - 1)
    : new Date(value);
}
