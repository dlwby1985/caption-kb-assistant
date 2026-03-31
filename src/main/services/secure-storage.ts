import { safeStorage, app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

type ApiKeyProvider = 'anthropic' | 'openai'

function credentialsPath(): string {
  return path.join(app.getPath('userData'), 'credentials.json')
}

function readCredentials(): Record<string, string> {
  const p = credentialsPath()
  if (!fs.existsSync(p)) return {}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {
    return {}
  }
}

function writeCredentials(data: Record<string, string>): void {
  const p = credentialsPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

// AES-256-GCM fallback when safeStorage is unavailable
function deriveAesKey(): Buffer {
  const info = `${require('os').hostname()}::${require('os').userInfo().username}`
  return crypto.scryptSync(info, 'caption-kb-assistant-v1', 32)
}

function aesEncrypt(plaintext: string): string {
  const key = deriveAesKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return 'aes:' + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function aesDecrypt(stored: string): string {
  const key = deriveAesKey()
  const data = Buffer.from(stored.slice(4), 'base64')  // strip "aes:" prefix
  const iv = data.subarray(0, 16)
  const tag = data.subarray(16, 32)
  const encrypted = data.subarray(32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf-8')
}

/** Store an API key securely */
export function setApiKey(provider: ApiKeyProvider, plaintext: string): void {
  const creds = readCredentials()

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(plaintext)
    creds[provider] = 'safe:' + encrypted.toString('base64')
  } else {
    creds[provider] = aesEncrypt(plaintext)
  }

  writeCredentials(creds)
}

/** Retrieve an API key */
export function getApiKey(provider: ApiKeyProvider): string {
  const creds = readCredentials()
  const stored = creds[provider]
  if (!stored) return ''

  try {
    if (stored.startsWith('safe:')) {
      const buffer = Buffer.from(stored.slice(5), 'base64')
      return safeStorage.decryptString(buffer)
    }
    if (stored.startsWith('aes:')) {
      return aesDecrypt(stored)
    }
    // Legacy plaintext — re-encrypt on read
    setApiKey(provider, stored)
    return stored
  } catch {
    return ''
  }
}

/** Check if an API key exists */
export function hasApiKey(provider: ApiKeyProvider): boolean {
  const creds = readCredentials()
  return !!creds[provider]
}

/** Delete an API key */
export function deleteApiKey(provider: ApiKeyProvider): void {
  const creds = readCredentials()
  delete creds[provider]
  writeCredentials(creds)
}
