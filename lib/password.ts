import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("base64")}:${derivedKey.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string) {
  if (typeof stored !== "string" || stored.length === 0) {
    return false;
  }

  const [saltPart, hashPart] = stored.split(":");
  if (!saltPart || !hashPart) {
    return false;
  }

  try {
    const salt = Buffer.from(saltPart, "base64");
    const storedHash = Buffer.from(hashPart, "base64");
    const derived = scryptSync(password, salt, storedHash.length);

    return timingSafeEqual(derived, storedHash);
  } catch {
    return false;
  }
}
