import {
  Platform,
  type SocialAccount,
  SocialAccountStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getPublisher } from "@/lib/publishers";
import type { ConnectedAccount, PublisherTokens } from "@/lib/publishers/types";

export async function saveConnectedAccount(
  userId: string,
  platform: Platform,
  data: ConnectedAccount,
  status: SocialAccountStatus = SocialAccountStatus.ACTIVE,
) {
  const accessTokenEnc = encryptToken(data.tokens.accessToken);
  const refreshTokenEnc = data.tokens.refreshToken
    ? encryptToken(data.tokens.refreshToken)
    : null;

  const common = {
    username: data.username ?? null,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    accessTokenEnc,
    refreshTokenEnc,
    tokenExpiresAt: data.tokens.expiresAt ?? null,
    scope: data.tokens.scope ?? null,
    status,
    lastError: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: (data.metadata as any) ?? undefined,
  };

  return prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId,
        platform,
        platformAccountId: data.platformAccountId,
      },
    },
    update: common,
    create: {
      userId,
      platform,
      platformAccountId: data.platformAccountId,
      ...common,
    },
  });
}

export function decryptAccountTokens(account: SocialAccount): PublisherTokens {
  return {
    accessToken: decryptToken(account.accessTokenEnc),
    refreshToken: account.refreshTokenEnc
      ? decryptToken(account.refreshTokenEnc)
      : null,
    expiresAt: account.tokenExpiresAt,
    scope: account.scope,
  };
}

/**
 * Return valid tokens for an account, refreshing (and persisting) them when
 * they are expired or about to expire. Marks the account EXPIRED on failure.
 */
export async function ensureFreshTokens(
  account: SocialAccount,
): Promise<PublisherTokens> {
  const tokens = decryptAccountTokens(account);
  const skewMs = 60_000;
  const expiring = account.tokenExpiresAt
    ? account.tokenExpiresAt.getTime() - skewMs < Date.now()
    : false;
  if (!expiring) return tokens;

  const publisher = getPublisher(account.platform);
  if (!publisher) return tokens;

  try {
    const refreshed = await publisher.refresh(tokens);
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEnc: encryptToken(refreshed.accessToken),
        refreshTokenEnc: refreshed.refreshToken
          ? encryptToken(refreshed.refreshToken)
          : account.refreshTokenEnc,
        tokenExpiresAt: refreshed.expiresAt ?? null,
        scope: refreshed.scope ?? account.scope,
        status: SocialAccountStatus.ACTIVE,
        lastError: null,
      },
    });
    return refreshed;
  } catch (e) {
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        status: SocialAccountStatus.EXPIRED,
        lastError: e instanceof Error ? e.message : "token refresh failed",
      },
    });
    throw e;
  }
}
