/// <reference types="node" />
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assembleChunks,
  capLatest,
  chunkKey,
  collectionKey,
  coreKey,
  createChunkedStorage,
  createSplitPersistStorage,
  encodeManifest,
  parseManifest,
  splitIntoChunks,
  type StringStorage,
} from '../src/lib/persist-layout'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  const storage: StringStorage = {
    getItem: async (name) => data.get(name) ?? null,
    setItem: async (name, value) => {
      writes.push(name)
      data.set(name, value)
    },
    removeItem: async (name) => {
      data.delete(name)
    },
  }
  return { data, writes, storage }
}

// Manual timers so debounce behavior is deterministic.
function manualTimers() {
  let pending: Array<() => void> = []
  return {
    setTimer: (callback: () => void) => {
      pending.push(callback)
      return callback
    },
    clearTimer: (timer: unknown) => {
      pending = pending.filter((entry) => entry !== timer)
    },
    runAll: () => {
      const current = pending
      pending = []
      current.forEach((callback) => callback())
    },
    get count() {
      return pending.length
    },
  }
}

describe('chunking', () => {
  it('splits and reassembles values', () => {
    const value = 'abcdefghij'
    const chunks = splitIntoChunks(value, 3)
    assert.deepEqual(chunks, ['abc', 'def', 'ghi', 'j'])
    assert.equal(assembleChunks({ gen: 'g', count: 4, length: 10 }, chunks), value)
  })

  it('rejects missing chunks and length mismatches', () => {
    assert.equal(assembleChunks({ gen: 'g', count: 2, length: 4 }, ['ab', null]), null)
    assert.equal(assembleChunks({ gen: 'g', count: 2, length: 5 }, ['ab', 'cd']), null)
    assert.equal(assembleChunks({ gen: 'g', count: 3, length: 4 }, ['ab', 'cd']), null)
  })

  it('round-trips manifests and ignores ordinary values', () => {
    const manifest = { gen: 'x1', count: 3, length: 1200 }
    assert.deepEqual(parseManifest(encodeManifest(manifest)), manifest)
    assert.equal(parseManifest('{"state":{}}'), null)
    assert.equal(parseManifest(null), null)
    assert.equal(parseManifest('miqorai.chunked.v1:{broken'), null)
  })

  it('stores small values inline and large values as chunks plus manifest', async () => {
    const { data, storage } = memoryStorage()
    let gen = 0
    const chunked = createChunkedStorage(storage, { chunkSize: 4, generation: () => `g${++gen}` })

    await chunked.setItem('k', 'abc')
    assert.equal(data.get('k'), 'abc')

    await chunked.setItem('k', 'abcdefghij')
    assert.ok(parseManifest(data.get('k')))
    assert.equal(data.get(chunkKey('k', 'g1', 0)), 'abcd')
    assert.equal(await chunked.getItem('k'), 'abcdefghij')

    // A new generation replaces the old chunks and cleans them up.
    await chunked.setItem('k', '0123456789AB')
    assert.equal(data.has(chunkKey('k', 'g1', 0)), false)
    assert.equal(await chunked.getItem('k'), '0123456789AB')

    // Shrinking back below the threshold removes every chunk.
    await chunked.setItem('k', 'xy')
    assert.deepEqual([...data.keys()], ['k'])
    assert.equal(await chunked.getItem('k'), 'xy')

    await chunked.removeItem('k')
    assert.equal(data.size, 0)
  })

  it('cleans up chunks written by a previous app session', async () => {
    const { data, storage } = memoryStorage()
    const first = createChunkedStorage(storage, { chunkSize: 2, generation: () => 'old' })
    await first.setItem('k', 'abcdef')
    const second = createChunkedStorage(storage, { chunkSize: 2, generation: () => 'new' })
    await second.setItem('k', 'ghijkl')
    assert.equal([...data.keys()].filter((key) => key.includes('.chunk.old.')).length, 0)
    assert.equal(await second.getItem('k'), 'ghijkl')
  })

  it('returns null for a torn chunked value', async () => {
    const { data, storage } = memoryStorage()
    const chunked = createChunkedStorage(storage, { chunkSize: 2, generation: () => 'g' })
    await chunked.setItem('k', 'abcdef')
    data.delete(chunkKey('k', 'g', 1))
    assert.equal(await createChunkedStorage(storage).getItem('k'), null)
  })
})

type TestState = {
  isAuthenticated: boolean
  token: string | null
  language: string
  medications: Array<{ id: string }>
  activityLog: Array<{ id: string; timestamp: string }>
}

const COLLECTIONS = ['medications', 'activityLog'] as const

function makeState(overrides: Partial<TestState> = {}): TestState {
  return {
    isAuthenticated: true,
    token: 't1',
    language: 'en',
    medications: [{ id: 'm1' }],
    activityLog: [{ id: 'a1', timestamp: '2026-01-01T00:00:00Z' }],
    ...overrides,
  }
}

describe('split persist storage', () => {
  it('writes core and each collection to separate keys', async () => {
    const { data, storage } = memoryStorage()
    const timers = manualTimers()
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS, ...timers })

    await persist.setItem('app', { state: makeState(), version: 2 })
    await persist.flush()

    assert.deepEqual(JSON.parse(data.get(coreKey('app'))!), {
      state: { isAuthenticated: true, token: 't1', language: 'en' },
      version: 2,
    })
    assert.deepEqual(JSON.parse(data.get(collectionKey('app', 'medications'))!), [{ id: 'm1' }])
    assert.equal(data.has('app'), false)

    const restored = await createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS }).getItem('app')
    assert.deepEqual(restored, { state: makeState(), version: 2 })
  })

  it('debounces rapid changes into one write of the latest state', async () => {
    const { data, writes, storage } = memoryStorage()
    const timers = manualTimers()
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS, ...timers })
    await persist.getItem('app')

    for (let index = 0; index < 20; index += 1) {
      await persist.setItem('app', { state: makeState({ language: `l${index}` }), version: 0 })
    }
    assert.equal(writes.length, 0)
    assert.equal(timers.count, 1)

    timers.runAll()
    await persist.flush()
    assert.equal(JSON.parse(data.get(coreKey('app'))!).state.language, 'l19')
    // core + two collections, written once each.
    assert.equal(writes.length, 3)
  })

  it('skips keys whose content did not change', async () => {
    const { writes, storage } = memoryStorage()
    const timers = manualTimers()
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS, ...timers })

    await persist.setItem('app', { state: makeState(), version: 0 })
    await persist.flush()
    writes.length = 0

    await persist.setItem('app', { state: makeState({ language: 'fr' }), version: 0 })
    await persist.flush()
    assert.deepEqual(writes, [coreKey('app')])
  })

  it('writes urgent changes immediately', async () => {
    const { data, storage } = memoryStorage()
    const timers = manualTimers()
    const persist = createSplitPersistStorage<TestState>({
      storage,
      collections: COLLECTIONS,
      ...timers,
      isUrgent: (previous, next) => previous?.token !== next.token,
    })
    await persist.setItem('app', { state: makeState(), version: 0 })
    await persist.setItem('app', { state: makeState({ token: 't2' }), version: 0 })
    assert.equal(JSON.parse(data.get(coreKey('app'))!).state.token, 't2')
  })

  it('migrates the legacy single-row value and deletes it', async () => {
    const legacy = { state: makeState(), version: 1 }
    const { data, storage } = memoryStorage({ app: JSON.stringify(legacy) })
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS })

    const restored = await persist.getItem('app')
    assert.deepEqual(restored, legacy)
    assert.equal(data.has('app'), false)
    assert.ok(data.has(coreKey('app')))
    assert.ok(data.has(collectionKey('app', 'activityLog')))

    // Second launch reads the split layout.
    const again = await createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS }).getItem('app')
    assert.deepEqual(again, legacy)
  })

  it('keeps an unreadable legacy value and starts empty', async () => {
    const { data, storage } = memoryStorage({ app: 'not json' })
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS })
    assert.equal(await persist.getItem('app'), null)
    assert.equal(data.get('app'), 'not json')
  })

  it('treats a corrupt or failing collection as empty without failing hydration', async () => {
    const { data, storage } = memoryStorage()
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS })
    await persist.setItem('app', { state: makeState(), version: 0 })
    await persist.flush()
    data.set(collectionKey('app', 'medications'), '{corrupt')

    const failing: StringStorage = {
      ...storage,
      getItem: async (name) => {
        if (name === collectionKey('app', 'activityLog')) {
          throw new Error('Row too big to fit into CursorWindow')
        }
        return storage.getItem(name)
      },
    }
    const restored = await createSplitPersistStorage<TestState>({ storage: failing, collections: COLLECTIONS }).getItem('app')
    assert.deepEqual(restored, {
      state: { isAuthenticated: true, token: 't1', language: 'en' },
      version: 0,
    })
  })

  it('removes every key on removeItem and cancels pending writes', async () => {
    const { data, storage } = memoryStorage()
    const timers = manualTimers()
    const persist = createSplitPersistStorage<TestState>({ storage, collections: COLLECTIONS, ...timers })
    await persist.setItem('app', { state: makeState(), version: 0 })
    await persist.flush()
    await persist.setItem('app', { state: makeState({ language: 'rw' }), version: 0 })
    await persist.removeItem('app')
    timers.runAll()
    await persist.flush()
    assert.equal(data.size, 0)
  })

  it('works end to end on top of the chunked storage', async () => {
    const { storage } = memoryStorage()
    const chunked = createChunkedStorage(storage, { chunkSize: 64 })
    const persist = createSplitPersistStorage<TestState>({ storage: chunked, collections: COLLECTIONS })
    const bigLog = Array.from({ length: 50 }, (_, index) => ({ id: `a${index}`, timestamp: '2026-01-01T00:00:00Z' }))
    await persist.setItem('app', { state: makeState({ activityLog: bigLog }), version: 0 })
    await persist.flush()

    const restored = await createSplitPersistStorage<TestState>({
      storage: createChunkedStorage(storage, { chunkSize: 64 }),
      collections: COLLECTIONS,
    }).getItem('app')
    assert.equal(restored?.state.activityLog.length, 50)
  })
})

describe('capLatest', () => {
  it('keeps the newest entries', () => {
    const entries = Array.from({ length: 600 }, (_, index) => ({
      id: index,
      timestamp: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    }))
    const capped = capLatest(entries, 500, (entry) => entry.timestamp)
    assert.equal(capped.length, 500)
    assert.equal(capped[0].id, 599)
    assert.equal(capped[499].id, 100)
  })

  it('returns short lists unchanged', () => {
    const entries = [{ timestamp: 'x' }]
    assert.equal(capLatest(entries, 500, (entry) => entry.timestamp), entries)
  })
})
