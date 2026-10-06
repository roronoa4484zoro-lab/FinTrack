import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives or parses a 32-byte key for AES-256-GCM from the provided secret.
 * Supports 32-byte raw Base64 strings, 64-char Hex strings, or derives via SHA-256 hash.
 */
export function getEncryptionKey(secret?: string): Buffer {
  const secretKey = secret || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in production');
    }
    return crypto.createHash('sha256').update('fintrack-dev-encryption-key-fallback').digest();
  }

  // Check if valid 32-byte base64
  try {
    const b64 = Buffer.from(secretKey, 'base64');
    if (b64.length === 32) {
      return b64;
    }
  } catch {
    // continue
  }

  // Check if valid 32-byte hex
  try {
    if (secretKey.length === 64) {
      const hex = Buffer.from(secretKey, 'hex');
      if (hex.length === 32) {
        return hex;
      }
    }
  } catch {
    // continue
  }

  // Deterministic 32-byte hash
  return crypto.createHash('sha256').update(secretKey).digest();
}

export function encrypt(text: string, secret?: string): string {
  if (typeof text !== 'string') {
    text = String(text);
  }
  const key = getEncryptionKey(secret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string, secret?: string): string {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Invalid ciphertext input');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // In case plaintext was stored in DB during testing
    if (!isNaN(Number(encryptedData))) {
      return encryptedData;
    }
    throw new Error('Malformed encrypted payload');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const key = getEncryptionKey(secret);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or auth tag length');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

