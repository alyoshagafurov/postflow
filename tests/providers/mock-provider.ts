/** A fully interface-conformant in-memory provider for tests. */
import { defineCapabilities } from "@/providers/core/capabilities";
import type {
  AuthProvider,
  NormalizedProfile,
  ProviderConfig,
  Publisher,
  PublishResult,
  PublishStatusResult,
  SocialProvider,
  TokenSet,
} from "@/providers/core/types";

export const mockConfig: ProviderConfig = {
  id: "mock",
  label: "Mock",
  color: "#123456",
  apiVersion: "v1",
  baseUrl: "https://api.mock.test/v1",
  authUrl: "https://mock.test/oauth/authorize",
  tokenUrl: "https://api.mock.test/v1/oauth/token",
  scopes: ["read", "write"],
  capabilities: defineCapabilities({ video: true, image: true, scheduling: true }),
  usesPkce: true,
  reviewEnvFlag: "MOCK_APPROVED",
  credentials: () => ({ clientId: "id", clientSecret: "secret" }),
};

export interface MockOptions {
  refreshResult?: TokenSet;
  refreshError?: Error;
  publishError?: Error;
  /** Fail this many publish attempts before succeeding (to test retry). */
  failTimes?: number;
}

export function createMockProvider(opts: MockOptions = {}) {
  const calls = { refresh: 0, publish: 0, profile: 0 };
  let failsLeft = opts.failTimes ?? 0;

  const profile: NormalizedProfile = {
    id: "acc-1",
    username: "mock_user",
    displayName: "Mock User",
    accountType: "business",
  };

  const auth: AuthProvider = {
    getAuthorizationUrl: (req) =>
      `${mockConfig.authUrl}?state=${req.state}&redirect_uri=${encodeURIComponent(req.redirectUri)}`,
    exchangeCode: async () => ({
      tokens: { accessToken: "at", refreshToken: "rt", scope: "read write" },
      profile,
    }),
    refreshToken: async (tokens) => {
      calls.refresh++;
      if (opts.refreshError) throw opts.refreshError;
      return (
        opts.refreshResult ?? {
          accessToken: "at-new",
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 3_600_000),
          scope: "read write",
        }
      );
    },
    revoke: async () => {},
    validateToken: async () => true,
    fetchProfile: async () => {
      calls.profile++;
      return profile;
    },
    fetchCapabilities: async () => mockConfig.capabilities,
  };

  const publisher: Publisher = {
    publish: async (): Promise<PublishResult> => {
      calls.publish++;
      if (failsLeft > 0) {
        failsLeft--;
        throw opts.publishError ?? new Error("transient");
      }
      if (opts.publishError && (opts.failTimes ?? 0) === 0) throw opts.publishError;
      return { platformPostId: "post-1", platformUrl: "https://mock.test/p/1", state: "PUBLISHED" };
    },
    getStatus: async (): Promise<PublishStatusResult> => ({ state: "PUBLISHED" }),
  };

  const provider: SocialProvider = {
    id: mockConfig.id,
    config: mockConfig,
    auth,
    publisher,
    isConfigured: () => true,
    requiresReview: () => false,
    capabilities: () => mockConfig.capabilities,
  };

  return { provider, calls };
}
