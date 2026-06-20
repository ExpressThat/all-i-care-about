use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use tauri::AppHandle;
use tauri_plugin_keyring::KeyringExt;

const KEYRING_SERVICE: &str = "encryption-key";
const ENCRYPTION_KEY_USER: &str = "expressthat.aica";
const AES_256_KEY_LENGTH_BYTES: usize = 32;
const AES_GCM_NONCE_LENGTH_BYTES: usize = 12;
const ENCRYPTED_SECRET_PREFIX: &str = "aica-secret:v1";

pub fn encrypt_secret(app: &AppHandle, plaintext: &str) -> Result<String, String> {
    let cipher = encryption_cipher(app)?;
    let mut nonce_bytes = [0_u8; AES_GCM_NONCE_LENGTH_BYTES];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let encrypted_value = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext.as_bytes())
        .map_err(|error| format!("Failed to encrypt secret: {error}"))?;

    Ok(format!(
        "{ENCRYPTED_SECRET_PREFIX}:{}:{}",
        STANDARD.encode(nonce_bytes),
        STANDARD.encode(encrypted_value)
    ))
}

pub fn decrypt_secret(app: &AppHandle, value: &str) -> Result<String, String> {
    if !is_encrypted_secret(value) {
        return Ok(value.to_string());
    }

    let mut parts = value.split(':');
    let prefix = parts.next();
    let version = parts.next();
    let nonce = parts.next();
    let encrypted_value = parts.next();

    if prefix != Some("aica-secret") || version != Some("v1") {
        return Err("Encrypted secret has an unsupported format.".to_string());
    }

    let nonce = nonce.ok_or_else(|| "Encrypted secret is missing a nonce.".to_string())?;
    let encrypted_value =
        encrypted_value.ok_or_else(|| "Encrypted secret is missing a value.".to_string())?;
    let nonce = STANDARD
        .decode(nonce)
        .map_err(|error| format!("Encrypted secret nonce is invalid: {error}"))?;
    let encrypted_value = STANDARD
        .decode(encrypted_value)
        .map_err(|error| format!("Encrypted secret value is invalid: {error}"))?;
    let cipher = encryption_cipher(app)?;
    let decrypted_value = cipher
        .decrypt(Nonce::from_slice(&nonce), encrypted_value.as_ref())
        .map_err(|error| format!("Failed to decrypt secret: {error}"))?;

    String::from_utf8(decrypted_value)
        .map_err(|error| format!("Decrypted secret is not valid UTF-8: {error}"))
}

pub fn is_encrypted_secret(value: &str) -> bool {
    value.starts_with(&format!("{ENCRYPTED_SECRET_PREFIX}:"))
}

fn encryption_cipher(app: &AppHandle) -> Result<Aes256Gcm, String> {
    let key = get_or_create_encryption_key(app)?;
    Ok(Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key)))
}

fn get_or_create_encryption_key(app: &AppHandle) -> Result<Vec<u8>, String> {
    let keyring = app.keyring();
    let existing_key = keyring
        .get_secret(KEYRING_SERVICE, ENCRYPTION_KEY_USER)
        .map_err(|error| format!("Failed to read encryption key: {error}"))?;

    if let Some(existing_key) = existing_key {
        if existing_key.len() == AES_256_KEY_LENGTH_BYTES {
            return Ok(existing_key);
        }
        return Err("Stored encryption key has an invalid length.".to_string());
    }

    let mut key = vec![0_u8; AES_256_KEY_LENGTH_BYTES];
    rand::thread_rng().fill_bytes(&mut key);
    keyring
        .set_secret(KEYRING_SERVICE, ENCRYPTION_KEY_USER, &key)
        .map_err(|error| format!("Failed to store encryption key: {error}"))?;

    Ok(key)
}
