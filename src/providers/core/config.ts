/**
 * Configuration helpers.
 *
 * Provider config values (versions, endpoints, scopes) are declared in each
 * provider's `config.ts`. Credentials are read from env at call time (never
 * captured at import time) so secret rotation takes effect without a rebuild.
 */
import type { ProviderConfig, ProviderCredentials } from "./types";

/** Read an env var, with an optional fallback chain (first non-empty wins). */
export function env(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return "";
}

/**
 * Build a credentials() reader from env var names. Supports fallback chains,
 * e.g. Instagram: INSTAGRAM_APP_ID → META_APP_ID.
 */
export function credentialsReader(spec: {
  clientId: string | string[];
  clientSecret: string | string[];
  extra?: Record<string, string | string[]>;
}): () => ProviderCredentials {
  const idNames = Array.isArray(spec.clientId) ? spec.clientId : [spec.clientId];
  const secretNames = Array.isArray(spec.clientSecret)
    ? spec.clientSecret
    : [spec.clientSecret];
  return () => {
    const extra: Record<string, string> = {};
    if (spec.extra) {
      for (const [k, v] of Object.entries(spec.extra)) {
        extra[k] = env(...(Array.isArray(v) ? v : [v]));
      }
    }
    return {
      clientId: env(...idNames),
      clientSecret: env(...secretNames),
      extra,
    };
  };
}

export function isConfigured(config: ProviderConfig): boolean {
  const c = config.credentials();
  return Boolean(c.clientId && c.clientSecret);
}

export function requiresReview(config: ProviderConfig): boolean {
  if (!config.reviewEnvFlag) return false;
  return env(config.reviewEnvFlag) !== "true";
}
