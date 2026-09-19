import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const HEX_KEY = /^[0-9a-fA-F]{64}$/;

export function parseSettingsEncryptionKey(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (HEX_KEY.test(value)) return Buffer.from(value, "hex");
  try {
    const buf = Buffer.from(value, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* invalid encoding */
  }
  return null;
}

export function encryptionStatus() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (raw == null || !String(raw).trim()) {
    return {
      ready: false,
      message:
        "لم يُضبط مفتاح التشفير SETTINGS_ENCRYPTION_KEY في ملف .env.local. أضيفي مفتاحًا بطول 32 بايت بصيغة base64 أو 64 خانة hex، ثم أعيدي تشغيل الخادم.",
    };
  }
  if (!parseSettingsEncryptionKey(raw)) {
    return {
      ready: false,
      message:
        "مفتاح التشفير SETTINGS_ENCRYPTION_KEY غير صالح. استخدمي 32 بايت بصيغة base64 أو 64 خانة hex في ملف .env.local.",
    };
  }
  return { ready: true, message: null };
}

function requireEncryptionKey() {
  const status = encryptionStatus();
  if (!status.ready) {
    const error = new Error(status.message);
    error.status = 400;
    throw error;
  }
  return parseSettingsEncryptionKey(process.env.SETTINGS_ENCRYPTION_KEY);
}

export function encryptSecret(plaintext) {
  if (typeof plaintext !== "string" || !plaintext) {
    const error = new Error("قيمة السر غير صحيحة.");
    error.status = 400;
    throw error;
  }
  const key = requireEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored) {
  const key = requireEncryptionKey();
  if (typeof stored !== "string") {
    const error = new Error("configured but unreadable");
    error.status = 400;
    throw error;
  }
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    const error = new Error("configured but unreadable");
    error.status = 400;
    throw error;
  }
  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = Buffer.from(parts[3], "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    const error = new Error("configured but unreadable");
    error.status = 400;
    throw error;
  }
}

export function secretLast4(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}
