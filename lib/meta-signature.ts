import { createHmac, timingSafeEqual } from "crypto";

export function verifyMetaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}
