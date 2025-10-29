import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifySignatureInput = {
  payload: string;
  signature: string | null | undefined;
  secret: string | null | undefined;
};

function decodeSignature(signature: string): Buffer | null {
  const normalized = signature.trim();

  if (normalized.length === 0) {
    return null;
  }

  const hexPattern = /^[0-9a-f]+$/i;

  try {
    if (hexPattern.test(normalized) && normalized.length % 2 === 0) {
      return Buffer.from(normalized, "hex");
    }

    const base64Candidate = Buffer.from(normalized, "base64");
    return base64Candidate.length > 0 ? base64Candidate : null;
  } catch {
    return null;
  }
}

export function verifyStreamSignature({
  payload,
  signature,
  secret,
}: VerifySignatureInput): boolean {
  if (!secret || !signature) {
    return false;
  }

  const signatureBuffer = decodeSignature(signature);

  if (!signatureBuffer) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(payload).digest();

  if (signatureBuffer.length !== digest.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, digest);
}
