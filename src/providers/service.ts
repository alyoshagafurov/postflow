/**
 * Application-facing provider service.
 *
 * The connect routes and the publish worker call ONLY these functions — they
 * never touch a concrete provider, the registry, or platform APIs. This is the
 * seam between the framework and the app (Prisma, crypto, storage, sessions).
 */
import { Platform, SocialAccountStatus, type SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { signState, verifyState } from "@/lib/oauth-state";
import { AuthenticationError, ConfigError } from "./core/errors";
import { createLogger } from "./core/logger";
import { createPkcePair } from "./core/oauth";
import { PublishingPipeline } from "./core/publishing";
import { getProvider } from "./core/registry";
import { TokenManager } from "./core/token-manager";
import type {
  NormalizedProfile,
  ProviderId,
  PublishInput,
  PublishResult,
  TokenSet,
} from "./core/types";
import { registerAllProviders } from "./index";
import {
  platformForProviderId,
  providerIdForPlatform,
} from "./adapters/platform-map";
import { storageMediaResolver } from "./adapters/media";
import {
  prismaTokenPersistence,
  toStoredAccount,
} from "./adapters/persistence";

registerAllProviders();

const log = createLogger("provider");
export const tokenManager = new TokenManager(prismaTokenPersistence);
export const publishingPipeline = new PublishingPipeline({
  media: storageMediaResolver,
});

// ---------------------------------------------------------------------------
// Connect (OAuth)
// ---------------------------------------------------------------------------

export interface ConnectStart {
  url: string;
  /** Set as an httpOnly cookie by the caller; echoed back at the callback. */
  pkceVerifier?: string;
}

export function startConnect(
  providerId: ProviderId,
  opts: { userId: string; redirectUri: string },
): ConnectStart {
  const provider = getProvider(providerId);
  if (!provider || !provider.isConfigured()) {
    throw new ConfigError(`Provider ${providerId} is not configured`, {
      provider: providerId,
    });
  }
  const state = signState({ userId: opts.userId, provider: providerId });
  const pkce = provider.config.usesPkce ? createPkcePair() : undefined;
  const url = provider.auth.getAuthorizationUrl({
    redirectUri: opts.redirectUri,
    state,
    pkce: pkce ? { challenge: pkce.challenge, method: pkce.method } : undefined,
  });
  log.info("connect start", { provider: providerId, userId: opts.userId });
  return { url, pkceVerifier: pkce?.verifier };
}

export interface CallbackParams {
  code: string;
  state: string;
  redirectUri: string;
  expectedUserId: string;
  pkceVerifier?: string;
}

export async function completeConnect(
  providerId: ProviderId,
  params: CallbackParams,
): Promise<{ accountId: string; platformAccountId: string; profile: NormalizedProfile }> {
  const provider = getProvider(providerId);
  if (!provider) throw new ConfigError(`Unknown provider ${providerId}`);

  const data = verifyState(params.state);
  if (
    !data ||
    data.userId !== params.expectedUserId ||
    data.provider !== providerId
  ) {
    throw new AuthenticationError("Invalid OAuth state", { provider: providerId });
  }

  const platform = platformForProviderId(providerId);
  if (!platform) {
    throw new ConfigError(
      `Provider ${providerId} is not enabled for connection yet`,
      { provider: providerId },
    );
  }

  const { tokens, profile } = await provider.auth.exchangeCode({
    code: params.code,
    redirectUri: params.redirectUri,
    pkceVerifier: params.pkceVerifier,
  });

  const status = provider.requiresReview()
    ? SocialAccountStatus.PENDING_VERIFICATION
    : SocialAccountStatus.ACTIVE;

  const account = await saveConnectedAccount(
    params.expectedUserId,
    platform,
    profile,
    tokens,
    status,
  );
  log.info("connect complete", {
    provider: providerId,
    userId: params.expectedUserId,
    platformAccountId: profile.id,
  });
  return { accountId: account.id, platformAccountId: profile.id, profile };
}

async function saveConnectedAccount(
  userId: string,
  platform: Platform,
  profile: NormalizedProfile,
  tokens: TokenSet,
  status: SocialAccountStatus,
) {
  const metadata: Record<string, unknown> = {
    ...(tokens.meta ?? {}),
    accountType: profile.accountType ?? "unknown",
  };
  const common = {
    username: profile.username ?? null,
    displayName: profile.displayName ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    accessTokenEnc: encryptToken(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    tokenExpiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    status,
    lastError: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: metadata as any,
  };
  return prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId,
        platform,
        platformAccountId: profile.id,
      },
    },
    update: common,
    create: { userId, platform, platformAccountId: profile.id, ...common },
  });
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function publishAccountVideo(
  account: SocialAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const providerId = providerIdForPlatform(account.platform);
  const provider = getProvider(providerId);
  if (!provider || !provider.isConfigured()) {
    throw new ConfigError(`Integration ${providerId} is not configured`, {
      provider: providerId,
    });
  }
  const stored = toStoredAccount(account);
  const tokens = await tokenManager.getFreshTokens(stored, provider);
  return publishingPipeline.publish(provider, tokens, input, {
    accountId: account.platformAccountId,
    targetMeta: stored.tokens.meta,
  });
}

// Re-exported for the worker (single import surface for publishing).
export { providerIdForPlatform };
