/// <reference types="node" />
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  QR_RETRY_BASE_MS,
  QR_RETRY_MAX_MS,
  backoffDelayMs,
  nextRetryAt,
  qrRefreshMarginMs,
  shouldAutoRefresh,
} from '../src/lib/backoff'

describe('QR backoff', () => {
  it('doubles from 2s and caps at 60s', () => {
    const schedule = Array.from({ length: 8 }, (_, index) => backoffDelayMs(index + 1))
    assert.deepEqual(schedule, [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000])
    assert.equal(QR_RETRY_BASE_MS, 2_000)
    assert.equal(QR_RETRY_MAX_MS, 60_000)
  })

  it('has no delay after a success and never overflows', () => {
    assert.equal(backoffDelayMs(0), 0)
    assert.equal(backoffDelayMs(10_000), 60_000)
  })

  it('computes the next retry time', () => {
    assert.equal(nextRetryAt(1_000, 3), 9_000)
  })

  it('makes at most ~1 request per minute after an hour offline', () => {
    let now = 0
    let failures = 0
    let requests = 0
    while (now < 60 * 60 * 1000) {
      requests += 1
      failures += 1
      now = nextRetryAt(now, failures)
    }
    // 5 ramp-up attempts plus about one per minute (vs 3600 at 1/second).
    assert.ok(requests <= 65, `made ${requests} requests`)
  })

  it('only auto-refreshes when due, not backing off and not in flight', () => {
    const base = { now: 10_000, refreshDueAt: 5_000, retryAt: 0, inFlight: false }
    assert.equal(shouldAutoRefresh(base), true)
    assert.equal(shouldAutoRefresh({ ...base, refreshDueAt: 20_000 }), false)
    assert.equal(shouldAutoRefresh({ ...base, retryAt: 12_000 }), false)
    assert.equal(shouldAutoRefresh({ ...base, inFlight: true }), false)
  })

  it('refreshes at half the TTL with a 15s floor', () => {
    assert.equal(qrRefreshMarginMs(300), 150_000)
    assert.equal(qrRefreshMarginMs(10), 15_000)
  })
})
