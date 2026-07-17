/**
 * Centralised token lifecycle manager.
 *
 * Responsibilities (per spec): refresh expired tokens, store expiration, token
 * rotation, automatic refresh, reconnect detection, and scope validation. It is
 * decoupled from Prisma/crypto via a small persistence port so it can be
 * unit-tested with an in-memory fake.
 */
import { TokenExpiredError, ScopeError, isProviderError } from "./errors";
import { createLogger, type Logger } from "./logger";
import { missingScopes } from "./oauth";
import type { AccountStatus, SocialProvider, TokenSet } from "./types";

export interface StoredAccount {
  id: string;
  providerId: string;
  tokens: TokenSet;
  status: AccountStatus;
}

/** Persistence side-effects the manager needs. Implemented by an app adapter. */
export interface TokenPersistence {
  saveTokens(accountId: string, tokens: TokenSet): Promise<void>;
  markStatus(accountId: string, status: AccountStatus, error?: string): Promise<void>;
}

export interface TokenManagerOptions {
  /** Refresh this many ms before actual expiry (clock skew guard). */
  skewMs?: number;
  logger?: Logger;
}

export class TokenManager {
  private readonly persistence: TokenPersistence;
  private readonly skewMs: number;
  private readonly logger: Logger;

  constructor(persistence: TokenPersistence, opts: TokenManagerOptions = {}) {
    this.persistence = persistence;
    this.skewMs = opts.skewMs ?? 60_000;
    this.logger = opts.logger ?? createLogger("token");
  }

  isExpiring(tokens: TokenSet): boolean {
    if (!tokens.expiresAt) return false;
    return tokens.expiresAt.getTime() - this.skewMs < Date.now();
  }

  /**
   * Return valid tokens for an account, auto-refreshing + persisting when they
   * are expired/expiring. Handles rotation and reconnect detection.
   */
  async getFreshTokens(
    account: StoredAccount,
    provider: SocialProvider,
  ): Promise<TokenSet> {
    const { tokens } = account;
    if (!this.isExpiring(tokens)) return tokens;

    // Self-refreshing providers (e.g. Instagram long-lived tokens) renew by
    // re-presenting the current access token, so a missing refresh token is
    // NOT a reconnect condition for them.
    if (!tokens.refreshToken && !provider.config.selfRefreshing) {
      await this.persistence.markStatus(
        account.id,
        "EXPIRED",
        "reconnect required",
      );
      throw new TokenExpiredError("Access expired and no refresh token", {
        provider: provider.id,
        reconnectRequired: true,
      });
    }

    this.logger.info("refreshing token", {
      provider: provider.id,
      accountId: account.id,
    });

    try {
      const refreshed = await provider.auth.refreshToken(tokens);
      // Rotation: keep the new refresh token if provided, else retain the old.
      const merged: TokenSet = {
        ...refreshed,
        refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
      };
      await this.persistence.saveTokens(account.id, merged);
      await this.persistence.markStatus(account.id, "ACTIVE");
      return merged;
    } catch (error) {
      const message = isProviderError(error) ? error.message : "token refresh failed";
      await this.persistence.markStatus(account.id, "EXPIRED", message);
      this.logger.error("token refresh failed", {
        provider: provider.id,
        accountId: account.id,
        message,
      });
      throw new TokenExpiredError(message, {
        provider: provider.id,
        reconnectRequired: true,
        cause: error,
      });
    }
  }

  /** Validate that all required scopes were granted; throws ScopeError if not. */
  assertScopes(provider: SocialProvider, tokens: TokenSet): void {
    const missing = missingScopes(provider.config.scopes, tokens.scope);
    if (missing.length > 0) {
      throw new ScopeError(`Missing scopes: ${missing.join(", ")}`, {
        provider: provider.id,
        missingScopes: missing,
      });
    }
  }
}
