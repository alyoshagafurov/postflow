import crypto from "node:crypto";
import { env } from "@/lib/env";

// Signed, time-limited OAuth `state` — protects the connect flow against CSRF
// without needing server-side session storage.

function hmac(body: string): string {
  return crypto
    .createHmac("sha256", env.NEXTAUTH_SECRET)
    .update(body)
    .digest("base64url");
}

export function signState(payload: Record<string, unknown>): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, ts: Date.now() }),
  ).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyState(
  state: string,
  maxAgeMs = 10 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.ts !== "number" || Date.now() - data.ts > maxAgeMs) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
