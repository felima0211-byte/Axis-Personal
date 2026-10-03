import 'server-only'
import { CryptoError } from './errors'

export interface KeyMap {
  [version: string]: Buffer
}

let _keys: KeyMap | null = null
let _activeVersion: string | null = null
let _blindKey: Buffer | null = null

function loadKeys(): { keys: KeyMap; activeVersion: string; blindKey: Buffer } {
  if (_keys && _activeVersion && _blindKey) {
    return { keys: _keys, activeVersion: _activeVersion, blindKey: _blindKey }
  }

  const raw = process.env.ENCRYPTION_KEYS
  const activeVersion = process.env.ENCRYPTION_ACTIVE_VERSION
  const blindRaw = process.env.BLIND_INDEX_KEY

  if (!raw || !activeVersion || !blindRaw) {
    throw new CryptoError('Encryption env vars not configured (ENCRYPTION_KEYS, ENCRYPTION_ACTIVE_VERSION, BLIND_INDEX_KEY)')
  }

  let parsed: Record<string, string>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CryptoError('ENCRYPTION_KEYS is not valid JSON')
  }

  const keys: KeyMap = {}
  for (const [version, b64] of Object.entries(parsed)) {
    const buf = Buffer.from(b64, 'base64')
    if (buf.length !== 32) {
      throw new CryptoError(`Key version ${version} must be 32 bytes (got ${buf.length})`)
    }
    keys[version] = buf
  }

  if (!(activeVersion in keys)) {
    throw new CryptoError(`ENCRYPTION_ACTIVE_VERSION "${activeVersion}" not found in ENCRYPTION_KEYS`)
  }

  const blindBuf = Buffer.from(blindRaw, 'base64')
  if (blindBuf.length !== 32) {
    throw new CryptoError(`BLIND_INDEX_KEY must be 32 bytes (got ${blindBuf.length})`)
  }

  _keys = keys
  _activeVersion = activeVersion
  _blindKey = blindBuf

  return { keys, activeVersion, blindKey: blindBuf }
}

export function getKey(version: string): Buffer {
  const { keys } = loadKeys()
  const key = keys[version]
  if (!key) throw new CryptoError(`Unknown key version: ${version}`)
  return key
}

export function getActiveVersion(): string {
  return loadKeys().activeVersion
}

export function getBlindKey(): Buffer {
  return loadKeys().blindKey
}

export function getAllVersions(): string[] {
  return Object.keys(loadKeys().keys)
}
