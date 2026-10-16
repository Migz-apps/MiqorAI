import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

const PIN_HASH_KEY = 'miqorai.pin.hash'
const PIN_SALT_KEY = 'miqorai.pin.salt'

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`)
}

export async function setPin(pin: string) {
  try {
    const salt = bytesToHex(await Crypto.getRandomBytesAsync(16))
    const hash = await hashPin(pin, salt)
    await SecureStore.setItemAsync(PIN_SALT_KEY, salt)
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash)
    return true
  } catch {
    return false
  }
}

export async function verifyPin(pin: string) {
  try {
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY)
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY)
    if (!salt || !storedHash) {
      return false
    }

    return (await hashPin(pin, salt)) === storedHash
  } catch {
    return false
  }
}

export async function clearPin() {
  try {
    await SecureStore.deleteItemAsync(PIN_HASH_KEY)
    await SecureStore.deleteItemAsync(PIN_SALT_KEY)
  } catch {
    // Ignore: a stale hash without a matching salt simply fails verification.
  }
}

export async function hasPin() {
  try {
    const salt = await SecureStore.getItemAsync(PIN_SALT_KEY)
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY)
    return Boolean(salt && storedHash)
  } catch {
    return false
  }
}
