import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.APP_SECRET || 'formgenius-default-encryption-secret-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);

  return combined.toString('base64');
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = combined.subarray(IV_LENGTH + 16);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
