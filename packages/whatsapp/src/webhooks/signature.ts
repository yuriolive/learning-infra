import crypto from "node:crypto";

export function verifyWhatsAppSignature(
  payload: string,
  signature: string,
  appSecret: string,
): boolean {
  if (!signature || !appSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("hex");

  const trimmedSignature = signature.replace("sha256=", "");

  const encoder = new TextEncoder();
  // Use timingSafeEqual to prevent timing attacks
  try {
    const a = encoder.encode(expectedSignature);
    const b = encoder.encode(trimmedSignature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
