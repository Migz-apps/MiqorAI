/** Parses a JWT-style expiresIn duration ("7d", "15m", "12h", "30s", or bare seconds)
 * into milliseconds. Throws on anything it cannot parse so misconfiguration fails fast. */
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(value: string): number {
  const trimmed = value.trim();
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(trimmed);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = parseInt(match[1], 10);
  const unit = match[2] ?? "s";
  return amount * UNIT_MS[unit];
}
