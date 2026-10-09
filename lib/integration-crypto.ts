import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function encryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || "";
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
  } catch {}
  return null;
}

export function canEncryptIntegrationSecrets() {
  return Boolean(encryptionKey());
}

export function encryptIntegrationSecret(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("INTEGRATION_ENCRYPTION_KEY must be a 32-byte base64 value or 64-character hex value.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptIntegrationSecret(value: string | null | undefined) {
  if (!value) return null;
  const key = encryptionKey();
  if (!key) return null;
  const [version, ivB64, tagB64, dataB64] = value.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
