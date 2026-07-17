/**
 * Webhook signature verification helpers.
 *
 * Platforms sign webhook payloads with an HMAC of the raw request body using
 * the app secret. Verification MUST run on the raw bytes (before JSON parsing)
 * and use a constant-time comparison.
 */
import crypto from "node:crypto";

export interface HmacVerifyOptions {
  algorithm?: "sha1" | "sha256";
  /** e.g. Meta sends `sha256=<hex>`; strip/allow the prefix. */
  prefix?: string;
  encoding?: "hex" | "base64";
}

/** Constant-time compare of two strings. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function computeHmac(
  rawBody: string,
  secret: string,
  opts: HmacVerifyOptions = {},
): string {
  const algorithm = opts.algorithm ?? "sha256";
  const encoding = opts.encoding ?? "hex";
  return crypto.createHmac(algorithm, secret).update(rawBody, "utf8").digest(encoding);
}

/**
 * Verify an HMAC webhook signature against the raw body.
 * @param signature The signature header value (may include a `sha256=` prefix).
 */
export function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
  opts: HmacVerifyOptions = {},
): boolean {
  if (!signature || !secret) return false;
  const provided = opts.prefix
    ? signature.replace(new RegExp(`^${opts.prefix}`), "")
    : signature.replace(/^sha(1|256)=/, "");
  const expected = computeHmac(rawBody, secret, opts);
  return safeEqual(provided, expected);
}
