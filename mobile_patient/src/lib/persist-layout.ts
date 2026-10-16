// Storage layout for the persisted patient store. Kept free of React Native
// imports so the chunking, splitting and migration logic is unit-testable in
// plain Node.
//
// Why: AsyncStorage on Android cannot read a row larger than ~2 MB, and the
// store used to persist everything as one row rewritten on every change. Now:
//   <name>:core            small JSON { state, version } (session, profile, settings)
//   <name>:c:<collection>  one JSON array per large collection
//   <name>                 legacy single-row value, migrated then deleted
// Any value above CHUNK_SIZE is split by the chunked store (see below).

export type StringStorage = {
  getItem: (name: string) => string | null | Promise<string | null>
  setItem: (name: string, value: string) => unknown | Promise<unknown>
  removeItem: (name: string) => unknown | Promise<unknown>
}

// ---------------------------------------------------------------------------
// Chunking: a value above CHUNK_SIZE is written as numbered chunk keys plus a
// manifest under the original key. Chunks carry a generation id, so a crash
// mid-write leaves the previous manifest pointing at its own intact chunks.
// ---------------------------------------------------------------------------

export const CHUNK_SIZE = 512 * 1024
const MANIFEST_PREFIX = 'miqorai.chunked.v1:'

export type ChunkManifest = { gen: string; count: number; length: number }

export function splitIntoChunks(value: string, chunkSize = CHUNK_SIZE): string[] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be positive')
  }
  const chunks: string[] = []
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    chunks.push(value.slice(offset, offset + chunkSize))
  }
  return chunks.length ? chunks : ['']
}

export function chunkKey(name: string, gen: string, index: number) {
  return `${name}.chunk.${gen}.${index}`
}

export function encodeManifest(manifest: ChunkManifest) {
  return `${MANIFEST_PREFIX}${JSON.stringify(manifest)}`
}

export function parseManifest(raw: string | null | undefined): ChunkManifest | null {
  if (!raw || !raw.startsWith(MANIFEST_PREFIX)) {
    return null
  }
  try {
    const parsed = JSON.parse(raw.slice(MANIFEST_PREFIX.length)) as Partial<ChunkManifest>
    if (
      typeof parsed.gen === 'string' &&
      typeof parsed.count === 'number' &&
      typeof parsed.length === 'number' &&
      parsed.count > 0
    ) {
      return { gen: parsed.gen, count: parsed.count, length: parsed.length }
    }
  } catch {
    // Fall through: not a usable manifest.
  }
  return null
}

// Joins chunks back; returns null when anything is missing or the length does
// not match the manifest (a torn write), so callers treat it as empty.
export function assembleChunks(manifest: ChunkManifest, chunks: Array<string | null | undefined>): string | null {
  if (chunks.length !== manifest.count || chunks.some((chunk) => typeof chunk !== 'string')) {
    return null
  }
  const value = (chunks as string[]).join('')
  return value.length === manifest.length ? value : null
}

let generationCounter = 0
function defaultGeneration() {
  generationCounter += 1
  return `${Date.now().toString(36)}${generationCounter.toString(36)}`
}

export function createChunkedStorage(
  raw: StringStorage,
  options: { chunkSize?: number; generation?: () => string } = {},
): StringStorage {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE
  const nextGeneration = options.generation ?? defaultGeneration
  // Last manifest known per key, so stale chunks can be cleaned up without
  // re-reading the key before every write. `undefined` = not looked up yet.
  const knownManifests = new Map<string, ChunkManifest | null>()

  async function currentManifest(name: string) {
    if (!knownManifests.has(name)) {
      try {
        knownManifests.set(name, parseManifest(await raw.getItem(name)))
      } catch {
        knownManifests.set(name, null)
      }
    }
    return knownManifests.get(name) ?? null
  }

  async function removeChunks(name: string, manifest: ChunkManifest | null) {
    if (!manifest) {
      return
    }
    for (let index = 0; index < manifest.count; index += 1) {
      await Promise.resolve(raw.removeItem(chunkKey(name, manifest.gen, index))).catch(() => undefined)
    }
  }

  return {
    async getItem(name) {
      const stored = await raw.getItem(name)
      const manifest = parseManifest(stored)
      knownManifests.set(name, manifest)
      if (!manifest) {
        return stored
      }
      const chunks = await Promise.all(
        Array.from({ length: manifest.count }, (_, index) =>
          Promise.resolve(raw.getItem(chunkKey(name, manifest.gen, index))).catch(() => null),
        ),
      )
      return assembleChunks(manifest, chunks)
    },
    async setItem(name, value) {
      const previous = await currentManifest(name)
      if (value.length <= chunkSize) {
        await raw.setItem(name, value)
        knownManifests.set(name, null)
      } else {
        const gen = nextGeneration()
        const chunks = splitIntoChunks(value, chunkSize)
        for (let index = 0; index < chunks.length; index += 1) {
          await raw.setItem(chunkKey(name, gen, index), chunks[index])
        }
        const manifest = { gen, count: chunks.length, length: value.length }
        await raw.setItem(name, encodeManifest(manifest))
        knownManifests.set(name, manifest)
      }
      if (previous) {
        await removeChunks(name, previous)
      }
    },
    async removeItem(name) {
      const previous = await currentManifest(name)
      await raw.removeItem(name)
      knownManifests.set(name, null)
      await removeChunks(name, previous)
    },
  }
}

// ---------------------------------------------------------------------------
// Split persistence: a zustand-compatible PersistStorage that stores the core
// state and each large collection under separate keys, debounces writes,
// skips unchanged keys and migrates the legacy single-row value.
// ---------------------------------------------------------------------------

export type StorageValue<S> = { state: S; version?: number }

export function coreKey(name: string) {
  return `${name}:core`
}

export function collectionKey(name: string, collection: string) {
  return `${name}:c:${collection}`
}

export function splitState<S extends Record<string, unknown>>(
  name: string,
  value: StorageValue<S>,
  collections: readonly string[],
): Record<string, string> {
  const core: Record<string, unknown> = {}
  const entries: Record<string, string> = {}
  for (const [key, item] of Object.entries(value.state)) {
    if (collections.includes(key)) {
      entries[collectionKey(name, key)] = JSON.stringify(item ?? [])
    } else {
      core[key] = item
    }
  }
  entries[coreKey(name)] = JSON.stringify({ state: core, version: value.version ?? 0 })
  return entries
}

function safeParse(raw: string | null | undefined): unknown {
  if (raw == null) {
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

// Keeps the newest `max` entries by timestamp (unparseable timestamps sort last).
export function capLatest<T>(items: readonly T[], max: number, timestampOf: (item: T) => string | number | undefined): T[] {
  if (items.length <= max) {
    return items as T[]
  }
  const time = (item: T) => {
    const value = timestampOf(item)
    const ms = typeof value === 'number' ? value : value ? Date.parse(value) : NaN
    return Number.isFinite(ms) ? ms : -Infinity
  }
  return [...items].sort((a, b) => time(b) - time(a)).slice(0, max)
}

type Timer = unknown

export type SplitPersistOptions<S> = {
  storage: StringStorage
  collections: readonly (keyof S & string)[]
  debounceMs?: number
  // When true for a change (e.g. new auth tokens), it is written immediately.
  isUrgent?: (previous: S | null, next: S) => boolean
  setTimer?: (callback: () => void, ms: number) => Timer
  clearTimer?: (timer: Timer) => void
}

export type SplitPersistStorage<S> = {
  getItem: (name: string) => Promise<StorageValue<S> | null>
  setItem: (name: string, value: StorageValue<S>) => Promise<void>
  removeItem: (name: string) => Promise<void>
  flush: () => Promise<void>
}

export function createSplitPersistStorage<S extends Record<string, unknown>>(
  options: SplitPersistOptions<S>,
): SplitPersistStorage<S> {
  const { storage, collections } = options
  const debounceMs = options.debounceMs ?? 500
  const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms))
  const clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>))

  // Serialized value per key as last written/read, to skip unchanged keys.
  const written = new Map<string, string>()
  let pending: { name: string; value: StorageValue<S> } | null = null
  let lastState: S | null = null
  let timer: Timer | null = null
  let chain: Promise<void> = Promise.resolve()

  const safeGet = async (key: string) => {
    try {
      return await storage.getItem(key)
    } catch {
      return null
    }
  }

  const safeRemove = async (key: string) => {
    try {
      await storage.removeItem(key)
    } catch {
      // Best-effort.
    }
  }

  async function writeEntries(entries: Record<string, string>) {
    for (const [key, serialized] of Object.entries(entries)) {
      if (written.get(key) === serialized) {
        continue
      }
      try {
        await storage.setItem(key, serialized)
        written.set(key, serialized)
      } catch {
        // Persistence is best-effort; the in-memory store stays authoritative.
      }
    }
  }

  function flush(): Promise<void> {
    if (timer != null) {
      clearTimer(timer)
      timer = null
    }
    const next = pending
    pending = null
    if (next) {
      chain = chain.then(() => writeEntries(splitState(next.name, next.value, collections)))
    }
    return chain
  }

  async function migrateLegacy(name: string): Promise<StorageValue<S> | null> {
    const legacy = safeParse(await safeGet(name)) as StorageValue<S> | undefined
    if (!legacy || typeof legacy !== 'object' || typeof legacy.state !== 'object' || legacy.state === null) {
      return null
    }
    const value: StorageValue<S> = { state: legacy.state, version: legacy.version ?? 0 }
    await writeEntries(splitState(name, value, collections))
    // Only drop the old row once the new core key is safely in place.
    if (written.has(coreKey(name))) {
      await safeRemove(name)
    }
    lastState = value.state
    return value
  }

  return {
    async getItem(name) {
      await chain
      const coreRaw = await safeGet(coreKey(name))
      if (coreRaw == null) {
        return migrateLegacy(name)
      }

      const core = safeParse(coreRaw) as StorageValue<Record<string, unknown>> | undefined
      if (!core || typeof core.state !== 'object' || core.state === null) {
        return null
      }
      written.set(coreKey(name), coreRaw)

      const state: Record<string, unknown> = { ...core.state }
      await Promise.all(
        collections.map(async (collection) => {
          const key = collectionKey(name, collection)
          const raw = await safeGet(key)
          const parsed = safeParse(raw)
          // A missing or unreadable collection is left out, so the store keeps
          // its empty default for it instead of failing hydration.
          if (Array.isArray(parsed)) {
            state[collection] = parsed
            written.set(key, raw as string)
          }
        }),
      )

      lastState = state as S
      return { state: state as S, version: core.version ?? 0 }
    },
    async setItem(name, value) {
      const urgent = options.isUrgent?.(lastState, value.state) ?? false
      lastState = value.state
      pending = { name, value }
      if (urgent) {
        await flush()
        return
      }
      if (timer == null) {
        timer = setTimer(() => {
          timer = null
          void flush()
        }, debounceMs)
      }
    },
    async removeItem(name) {
      if (timer != null) {
        clearTimer(timer)
        timer = null
      }
      pending = null
      lastState = null
      await chain
      const keys = [coreKey(name), ...collections.map((collection) => collectionKey(name, collection)), name]
      for (const key of keys) {
        await safeRemove(key)
        written.delete(key)
      }
    },
    flush,
  }
}
