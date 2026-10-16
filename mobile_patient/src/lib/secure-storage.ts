import AsyncStorage from '@react-native-async-storage/async-storage'
import CryptoJS from 'crypto-js'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import type { StateStorage } from 'zustand/middleware'

import { createChunkedStorage } from './persist-layout'

const ENCRYPTION_KEY_NAME = 'miqorai.storage.key'
const ENCRYPTED_PREFIX = 'miqorai.enc.v1:'

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function loadEncryptionKey(): Promise<string | null> {
  try {
    const existing = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME)
    if (existing) {
      return existing
    }

    const bytes = await Crypto.getRandomBytesAsync(32)
    const key = bytesToHex(bytes)
    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key)
    return key
  } catch {
    return null
  }
}

// Ciphertext above ~512 KB is split across numbered keys plus a manifest, so no
// single AsyncStorage row approaches Android's ~2 MB read limit.
const chunkedStorage = createChunkedStorage(AsyncStorage)

let keyPromise: Promise<string | null> | null = null

function getEncryptionKey() {
  if (!keyPromise) {
    keyPromise = loadEncryptionKey()
  }
  return keyPromise
}

async function writeEncrypted(name: string, value: string) {
  const key = await getEncryptionKey()
  if (!key) {
    // SecureStore is unavailable (e.g. web); keep the app working unencrypted.
    await chunkedStorage.setItem(name, value)
    return
  }

  const ciphertext = CryptoJS.AES.encrypt(value, key).toString()
  await chunkedStorage.setItem(name, `${ENCRYPTED_PREFIX}${ciphertext}`)
}

// AES-encrypts the persisted store before it touches AsyncStorage. Values
// written before encryption existed are read once as plaintext and rewritten
// encrypted; anything unreadable is treated as empty state instead of crashing.
export const secureStorage: StateStorage = {
  async getItem(name) {
    try {
      const stored = await chunkedStorage.getItem(name)
      if (stored == null) {
        return null
      }

      if (stored.startsWith(ENCRYPTED_PREFIX)) {
        const key = await getEncryptionKey()
        if (!key) {
          return null
        }

        const decrypted = CryptoJS.AES.decrypt(stored.slice(ENCRYPTED_PREFIX.length), key).toString(
          CryptoJS.enc.Utf8,
        )
        return decrypted || null
      }

      // Legacy plaintext payload: migrate it to the encrypted format.
      JSON.parse(stored)
      await writeEncrypted(name, stored).catch(() => undefined)
      return stored
    } catch {
      return null
    }
  },
  async setItem(name, value) {
    try {
      await writeEncrypted(name, value)
    } catch {
      // Persistence is best-effort; the in-memory store stays authoritative.
    }
  },
  async removeItem(name) {
    try {
      await chunkedStorage.removeItem(name)
    } catch {
      // Ignore: nothing recoverable to do if the removal fails.
    }
  },
}
