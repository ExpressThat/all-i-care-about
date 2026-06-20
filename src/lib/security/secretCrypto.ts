import { invoke } from "@tauri-apps/api/core"

const ENCRYPTED_SECRET_PREFIX = "aica-secret:v1"

export function isEncryptedSecret(value: string) {
  return value.startsWith(`${ENCRYPTED_SECRET_PREFIX}:`)
}

export function encryptSecret(value: string): Promise<string> {
  return invoke("encrypt_provider_secret", { plaintext: value })
}
