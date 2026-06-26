import crypto from "crypto";

/**
 * Verify if the signature sent from LINE matches the calculated signature.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifySignature(
  body: string,
  channelSecret: string,
  signature: string
): boolean {
  const calculated = generateSignature(body, channelSecret);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, "base64"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

/**
 * Generate signature for LINE request body using Channel Secret.
 */
export function generateSignature(body: string, channelSecret: string): string {
  return crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
}
