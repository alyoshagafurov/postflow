/**
 * OAuth2 / PKCE primitives shared by all providers.
 *
 * State signing (anti-CSRF) is delegated to the app's existing signed-state
 * helper. These functions are otherwise pure and dependency-free so they can be
 * unit-tested in isolation.
 */
import crypto from "node:crypto";

export type PkceMethod = "S256" | "plain";

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: PkceMethod;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** RFC 7636 PKCE pair (S256). */
export function createPkcePair(): PkcePair {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge, method: "S256" };
}

/** Build an authorize URL from a base and params, dropping empty values. */
export function buildAuthorizeUrl(
  base: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Join scopes with a separator (defaults to space; some providers use comma). */
export function joinScopes(scopes: string[], separator = " "): string {
  return scopes.join(separator);
}

/**
 * Given the scopes we requested and the scope string a provider returned,
 * compute which requested scopes are missing. Used for scope validation.
 */
export function missingScopes(requested: string[], granted?: string | null): string[] {
  if (!granted) return [...requested];
  const grantedSet = new Set(granted.split(/[\s,]+/).filter(Boolean));
  return requested.filter((s) => !grantedSet.has(s));
}
