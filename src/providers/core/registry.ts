/**
 * Provider registry — the single source of truth for which platforms exist.
 *
 * The application looks providers up by id here; it never imports a concrete
 * provider directly. Registering a new provider (see providers/index.ts) makes
 * it available everywhere with no other code change.
 */
import type { ProviderId, SocialProvider } from "./types";

const REGISTRY = new Map<ProviderId, SocialProvider>();

export function registerProvider(provider: SocialProvider): void {
  if (REGISTRY.has(provider.id)) {
    throw new Error(`Provider "${provider.id}" is already registered`);
  }
  REGISTRY.set(provider.id, provider);
}

export function getProvider(id: ProviderId): SocialProvider | null {
  return REGISTRY.get(id) ?? null;
}

export function requireProvider(id: ProviderId): SocialProvider {
  const p = REGISTRY.get(id);
  if (!p) throw new Error(`Unknown provider "${id}"`);
  return p;
}

export function listProviders(): SocialProvider[] {
  return [...REGISTRY.values()];
}

/** Providers whose credentials are present in the environment. */
export function listConfiguredProviders(): SocialProvider[] {
  return listProviders().filter((p) => p.isConfigured());
}

export function isProviderEnabled(id: ProviderId): boolean {
  return getProvider(id)?.isConfigured() ?? false;
}

/** Test/internal helper — clears the registry. */
export function __resetRegistry(): void {
  REGISTRY.clear();
}
