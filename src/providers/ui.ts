/**
 * Serializable provider descriptors for server components / the UI.
 *
 * The UI renders from these — labels, colors, whether configured, whether the
 * account needs review, and the capability list — so nothing about a platform
 * is hardcoded in a component.
 */
import type { Platform } from "@prisma/client";
import { enabledCapabilities, type Capability } from "./core/capabilities";
import { listProviders } from "./core/registry";
import { platformForProviderId } from "./adapters/platform-map";
import { registerAllProviders } from "./index";

registerAllProviders();

export interface ProviderDescriptor {
  id: string;
  platform: Platform;
  label: string;
  color: string;
  configured: boolean;
  requiresReview: boolean;
  capabilities: Capability[];
}

/** Providers that can currently be connected (they map to a DB platform). */
export function listConnectableProviders(): ProviderDescriptor[] {
  const out: ProviderDescriptor[] = [];
  for (const p of listProviders()) {
    const platform = platformForProviderId(p.id);
    if (!platform) continue;
    out.push({
      id: p.id,
      platform,
      label: p.config.label,
      color: p.config.color,
      configured: p.isConfigured(),
      requiresReview: p.requiresReview(),
      capabilities: enabledCapabilities(p.capabilities()),
    });
  }
  return out;
}
