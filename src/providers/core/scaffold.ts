/**
 * Scaffold provider factory.
 *
 * Turns a ProviderConfig into a fully interface-conformant SocialProvider whose
 * authorize-URL builder is REAL (so the OAuth entry point is demonstrable) but
 * whose live network calls throw NotImplementedError until someone implements
 * them. This is what makes "adding a platform = one folder" literally true.
 */
import { createOAuth2AuthProvider } from "./base-oauth2";
import { isConfigured, requiresReview } from "./config";
import { NotImplementedError } from "./errors";
import type { AuthProvider, ProviderConfig, SocialProvider } from "./types";

export function createScaffoldProvider(
  config: ProviderConfig,
  opts: { scopeSeparator?: string } = {},
): SocialProvider {
  const base = createOAuth2AuthProvider({
    config,
    scopeSeparator: opts.scopeSeparator,
    async fetchProfile() {
      throw new NotImplementedError(`${config.id}: not implemented yet`, {
        provider: config.id,
      });
    },
  });

  const auth: AuthProvider = {
    ...base,
    async exchangeCode() {
      throw new NotImplementedError(`${config.id}: OAuth exchange not implemented`, {
        provider: config.id,
      });
    },
    async refreshToken() {
      throw new NotImplementedError(`${config.id}: refresh not implemented`, {
        provider: config.id,
      });
    },
  };

  return {
    id: config.id,
    config,
    auth,
    publisher: {
      async publish() {
        throw new NotImplementedError(`${config.id}: publishing not implemented`, {
          provider: config.id,
        });
      },
      async getStatus() {
        throw new NotImplementedError(`${config.id}: status not implemented`, {
          provider: config.id,
        });
      },
    },
    isConfigured: () => isConfigured(config),
    requiresReview: () => requiresReview(config),
    capabilities: () => config.capabilities,
  };
}
