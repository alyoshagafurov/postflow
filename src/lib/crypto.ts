import crypto from "node:crypto";

// AES-256-GCM encryption for social-network tokens.
// Tokens are ONLY ever decrypted in-memory at the moment of an API call and
// are never stored in plaintext in the database.

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit nonce (GCM recommended)
const KEY_LEN = 32; // 256-bit key
const VERSION = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32`.",
    );
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    // 64 hex chars → 32 raw bytes.
    key = Buffer.from(raw, "hex");
  } else {
    const decoded = Buffer.from(raw, "base64");
    // Accept a 32-byte base64 key; otherwise derive a stable 32-byte key from
    // whatever value was provided, so any TOKEN_ENCRYPTION_KEY works.
    key =
      decoded.length === KEY_LEN
        ? decoded
        : crypto.createHash("sha256").update(raw, "utf8").digest();
  }
  cachedKey = key;
  return key;
}

/**
 * Encrypt a plaintext string.
 * Output format: `v1.<iv b64>.<authTag b64>.<ciphertext b64>`
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(".");
}

/** Decrypt a payload produced by {@link encryptToken}. */
export function decryptToken(payload: string): string {
  const key = getKey();
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid ciphertext format.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function encryptNullable(value?: string | null): string | null {
  return value ? encryptToken(value) : null;
}

export function decryptNullable(value?: string | null): string | null {
  return value ? decryptToken(value) : null;
}
