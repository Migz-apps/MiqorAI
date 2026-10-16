import { describe, expect, it } from "vitest";

import {
  DEFAULT_CURRENCY,
  PLATFORM_LOCALE,
  PLATFORM_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatIsoDate,
  formatMoney,
  formatNumber,
  formatRelative,
  formatTime,
} from "./format";

// 22:30 UTC on 15 Oct is 00:30 on 16 Oct in Kigali (UTC+2).
const LATE_UTC = "2026-10-15T22:30:00Z";

describe("platform defaults", () => {
  it("pins Kigali, RWF and an English locale", () => {
    expect(PLATFORM_TIME_ZONE).toBe("Africa/Kigali");
    expect(DEFAULT_CURRENCY).toBe("RWF");
    expect(["en-RW", "en-GB"]).toContain(PLATFORM_LOCALE);
  });
});

describe("dates in Kigali time", () => {
  it("rolls 22:30 UTC over to the next Kigali day", () => {
    expect(formatDate(LATE_UTC)).toBe("16 Oct 2026");
    expect(formatIsoDate(LATE_UTC)).toBe("2026-10-16");
  });

  it("renders the Kigali wall-clock time in 24-hour form", () => {
    expect(formatTime(LATE_UTC)).toBe("00:30");
    expect(formatDateTime(LATE_UTC)).toBe("16 Oct 2026, 00:30");
  });

  it("accepts custom fields", () => {
    // en-RW puts a comma after the weekday; the en-GB fallback does not.
    expect(formatDate(LATE_UTC, { weekday: "long", day: "numeric", month: "long" })).toMatch(
      /^Friday,? 16 October$/,
    );
  });

  it("returns a dash for missing or invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatTime("not a date")).toBe("—");
    expect(formatIsoDate("")).toBe("");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  it("describes past and future offsets", () => {
    expect(formatRelative("2026-10-16T11:59:30Z", { now })).toBe("just now");
    expect(formatRelative("2026-10-16T11:55:00Z", { now })).toBe("5 minutes ago");
    expect(formatRelative("2026-10-16T09:00:00Z", { now })).toBe("3 hours ago");
    expect(formatRelative("2026-10-15T12:00:00Z", { now })).toBe("yesterday");
    expect(formatRelative("2026-10-19T12:00:00Z", { now })).toBe("in 3 days");
  });
});

describe("formatMoney", () => {
  it("defaults to RWF with no decimals", () => {
    const out = formatMoney(1234.56);
    expect(out).toMatch(/^RWF\s1,235$/);
    expect(out).not.toContain(".");
  });

  it("keeps an explicit currency's own decimals", () => {
    expect(formatMoney(0.01, { currency: "USD" })).toMatch(/^USD\s0\.01$/);
  });

  it("supports compact notation and string amounts", () => {
    expect(formatMoney(1_234_567, { compact: true })).toMatch(/^RWF\s1\.2M$/);
    expect(formatMoney("2500")).toMatch(/^RWF\s2,500$/);
  });

  it("returns a dash for non-numbers", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("abc")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(12500)).toBe("12,500");
    expect(formatNumber(undefined)).toBe("—");
  });
});
