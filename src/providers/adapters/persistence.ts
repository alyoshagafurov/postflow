/**
 * Prisma-backed token persistence for the TokenManager, and helpers to convert
 * a stored SocialAccount row into the framework's StoredAccount (decrypting
 * tokens and re-attaching provider `meta` from the account's `metadata`).
 */
import { SocialAccountStatus, type SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";
import type { TokenPersistence } from "../core/token-manager";
import type { AccountStatus, TokenSet } from "../core/types";
import { providerIdForPlatform } from "./platform-map";
import type { StoredAccount } from "../core/token-manager";

const STATUS_TO_DB: Record<AccountStatus, SocialAccountStatus> = {
  ACTIVE: SocialAccountStatus.ACTIVE,
  EXPIRED: SocialAccountStatus.EXPIRED,
  REVOKED: SocialAccountStatus.REVOKED,
  PENDING_VERIFICATION: SocialAccountStatus.PENDING_VERIFICATION,
};

export const prismaTokenPersistence: TokenPersistence = {
  async saveTokens(accountId: string, tokens: TokenSet): Promise<void> {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessTokenEnc: encryptToken(tokens.accessToken),
        ...(tokens.refreshToken
          ? { refreshTokenEnc: encryptToken(tokens.refreshToken) }
          : {}),
        tokenExpiresAt: tokens.expiresAt ?? null,
        ...(tokens.scope ? { scope: tokens.scope } : {}),
        status: SocialAccountStatus.ACTIVE,
        lastError: null,
      },
    });
  },

  async markStatus(
    accountId: string,
    status: AccountStatus,
    error?: string,
  ): Promise<void> {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: STATUS_TO_DB[status], lastError: error ?? null },
    });
  },
};

/** Build a framework StoredAccount from a Prisma row (decrypts + attaches meta). */
export function toStoredAccount(account: SocialAccount): StoredAccount {
  const meta =
    account.metadata && typeof account.metadata === "object"
      ? (account.metadata as Record<string, unknown>)
      : {};
  const tokens: TokenSet = {
    accessToken: decryptToken(account.accessTokenEnc),
    refreshToken: account.refreshTokenEnc
      ? decryptToken(account.refreshTokenEnc)
      : null,
    expiresAt: account.tokenExpiresAt,
    scope: account.scope,
    meta,
  };
  return {
    id: account.id,
    providerId: providerIdForPlatform(account.platform),
    tokens,
    status: account.status as AccountStatus,
  };
}
