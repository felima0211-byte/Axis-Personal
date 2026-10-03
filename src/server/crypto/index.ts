import 'server-only'
import { randomBytes, createCipheriv, createDecipheriv, createHmac } from 'node:crypto'
import { CryptoError } from './errors'
import { getKey, getActiveVersion, getBlindKey } from './keys'

const IV_LENGTH = 12

// Payload format: v{version}:{iv_b64url}:{ciphertext_b64url}:{tag_b64url}
function encode(buf: Buffer): string {
  return buf.toString('base64url')
}

function decode(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

export function encryptField(plaintext: string, context: string): string {
  const version = getActiveVersion()
  const key = getKey(version)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(context, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v${version}:${encode(iv)}:${encode(ciphertext)}:${encode(tag)}`
}

export function decryptField(payload: string, context: string): string {
  const parts = payload.split(':')
  if (parts.length !== 4) throw new CryptoError('Invalid payload format')
  const [versionPart, ivB64, ciphertextB64, tagB64] = parts
  if (!versionPart.startsWith('v')) throw new CryptoError('Invalid version prefix')
  const version = versionPart.slice(1)
  const key = getKey(version)
  const iv = decode(ivB64)
  const ciphertext = decode(ciphertextB64)
  const tag = decode(tagB64)
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from(context, 'utf8'))
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plain.toString('utf8')
  } catch {
    throw new CryptoError('Decryption failed: authentication error or wrong key/context')
  }
}

export function encryptJson<T>(value: T, context: string): string {
  return encryptField(JSON.stringify(value), context)
}

export function decryptJson<T>(payload: string, context: string): T {
  return JSON.parse(decryptField(payload, context)) as T
}

export function blindIndex(value: string, purpose: string): string {
  const normalized = value.toLowerCase().trim()
  const key = getBlindKey()
  return createHmac('sha256', key)
    .update(`${purpose}:${normalized}`, 'utf8')
    .digest('base64url')
}

export { CryptoError }
