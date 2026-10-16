// Retry schedule for QR refreshes. Pure so it can be unit tested in Node.
// Failures back off 2s, 4s, 8s, 16s, 32s, then stay at 60s until a success
// resets the counter; this replaces the old once-per-second retry loop that
// hammered the API while the device was offline.

export const QR_RETRY_BASE_MS = 2_000
export const QR_RETRY_MAX_MS = 60_000

export function backoffDelayMs(failures: number, baseMs = QR_RETRY_BASE_MS, maxMs = QR_RETRY_MAX_MS) {
  if (failures <= 0) {
    return 0
  }
  // Cap the exponent too, so huge failure counts cannot overflow to Infinity.
  const exponent = Math.min(failures - 1, 30)
  return Math.min(maxMs, baseMs * 2 ** exponent)
}

export function nextRetryAt(now: number, failures: number, baseMs = QR_RETRY_BASE_MS, maxMs = QR_RETRY_MAX_MS) {
  return now + backoffDelayMs(failures, baseMs, maxMs)
}

// Whether the on-screen timer should trigger an automatic refresh right now.
export function shouldAutoRefresh(input: {
  now: number
  refreshDueAt: number
  retryAt: number
  inFlight: boolean
}) {
  return !input.inFlight && input.now >= input.refreshDueAt && input.now >= input.retryAt
}

// QR codes are renewed at half their server TTL (at least 15s before expiry),
// so the code on screen never reaches the moment the server rejects it.
export function qrRefreshMarginMs(ttlSeconds: number) {
  return Math.max(15, Math.floor(ttlSeconds / 2)) * 1000
}
