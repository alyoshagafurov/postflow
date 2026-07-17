import { describe, expect, it } from "vitest";
import { ScopeError, TokenExpiredError } from "@/providers/core/errors";
import { nullLogger } from "@/providers/core/logger";
import {
  TokenManager,
  type StoredAccount,
  type TokenPersistence,
} from "@/providers/core/token-manager";
import type { AccountStatus, TokenSet } from "@/providers/core/types";
import { createMockProvider } from "./mock-provider";

function fakePersistence() {
  const saved: Array<{ id: string; tokens: TokenSet }> = [];
  const statuses: Array<{ id: string; status: AccountStatus; error?: string }> = [];
  const persistence: TokenPersistence = {
    async saveTokens(id, tokens) {
      saved.push({ id, tokens });
    },
    async markStatus(id, status, error) {
      statuses.push({ id, status, error });
    },
  };
  return { persistence, saved, statuses };
}

function account(tokens: Partial<TokenSet>): StoredAccount {
  return {
    id: "acc-db-1",
    providerId: "mock",
    status: "ACTIVE",
    tokens: { accessToken: "at", refreshToken: "rt", ...tokens },
  };
}

const manager = (p: TokenPersistence) => new TokenManager(p, { logger: nullLogger });

describe("TokenManager", () => {
  it("returns tokens untouched when they are not expiring", async () => {
    const { persistence, saved } = fakePersistence();
    const { provider, calls } = createMockProvider();
    const acc = account({ expiresAt: new Date(Date.now() + 3_600_000) });

    const tokens = await manager(persistence).getFreshTokens(acc, provider);

    expect(tokens.accessToken).toBe("at");
    expect(calls.refresh).toBe(0);
    expect(saved).toHaveLength(0);
  });

  it("treats a token with no expiry as valid", async () => {
    const { persistence } = fakePersistence();
    const { provider, calls } = createMockProvider();

    const tokens = await manager(persistence).getFreshTokens(account({}), provider);

    expect(tokens.accessToken).toBe("at");
    expect(calls.refresh).toBe(0);
  });

  it("auto-refreshes and persists an expired token", async () => {
    const { persistence, saved, statuses } = fakePersistence();
    const { provider, calls } = createMockProvider();
    const acc = account({ expiresAt: new Date(Date.now() - 1000) });

    const tokens = await manager(persistence).getFreshTokens(acc, provider);

    expect(calls.refresh).toBe(1);
    expect(tokens.accessToken).toBe("at-new");
    expect(saved[0].tokens.accessToken).toBe("at-new");
    expect(statuses.at(-1)?.status).toBe("ACTIVE");
  });

  it("refreshes inside the skew window, before actual expiry", async () => {
    const { persistence } = fakePersistence();
    const { provider, calls } = createMockProvider();
    // Expires in 5s; default skew is 60s → must refresh.
    const acc = account({ expiresAt: new Date(Date.now() + 5_000) });

    await manager(persistence).getFreshTokens(acc, provider);

    expect(calls.refresh).toBe(1);
  });

  it("retains the previous refresh token when the provider does not rotate it", async () => {
    const { persistence, saved } = fakePersistence();
    const { provider } = createMockProvider({
      refreshResult: { accessToken: "at-new", refreshToken: null },
    });
    const acc = account({ expiresAt: new Date(Date.now() - 1000) });

    const tokens = await manager(persistence).getFreshTokens(acc, provider);

    expect(tokens.refreshToken).toBe("rt");
    expect(saved[0].tokens.refreshToken).toBe("rt");
  });

  it("stores a rotated refresh token when the provider issues one", async () => {
    const { persistence, saved } = fakePersistence();
    const { provider } = createMockProvider({
      refreshResult: { accessToken: "at-new", refreshToken: "rt-rotated" },
    });
    const acc = account({ expiresAt: new Date(Date.now() - 1000) });

    const tokens = await manager(persistence).getFreshTokens(acc, provider);

    expect(tokens.refreshToken).toBe("rt-rotated");
    expect(saved[0].tokens.refreshToken).toBe("rt-rotated");
  });

  it("refreshes a self-refreshing provider even with no refresh token (Instagram)", async () => {
    const { persistence, saved, statuses } = fakePersistence();
    const { provider, calls } = createMockProvider();
    const selfRefreshing = {
      ...provider,
      config: { ...provider.config, selfRefreshing: true },
    };
    // Exactly what Instagram connect persists: long-lived token, refreshToken null.
    const acc = account({ refreshToken: null, expiresAt: new Date(Date.now() - 1000) });

    const tokens = await manager(persistence).getFreshTokens(acc, selfRefreshing);

    expect(calls.refresh).toBe(1); // self-refresh was attempted, not skipped
    expect(tokens.accessToken).toBe("at-new");
    expect(saved).toHaveLength(1);
    expect(statuses.at(-1)?.status).toBe("ACTIVE");
  });

  it("detects reconnect-required when expired with no refresh token", async () => {
    const { persistence, statuses } = fakePersistence();
    const { provider, calls } = createMockProvider();
    const acc = account({ refreshToken: null, expiresAt: new Date(Date.now() - 1000) });

    await expect(
      manager(persistence).getFreshTokens(acc, provider),
    ).rejects.toBeInstanceOf(TokenExpiredError);

    expect(calls.refresh).toBe(0);
    expect(statuses.at(-1)).toMatchObject({ status: "EXPIRED" });
  });

  it("marks the account EXPIRED when refresh fails", async () => {
    const { persistence, statuses } = fakePersistence();
    const { provider } = createMockProvider({
      refreshError: new Error("invalid_grant"),
    });
    const acc = account({ expiresAt: new Date(Date.now() - 1000) });

    const err = await manager(persistence)
      .getFreshTokens(acc, provider)
      .catch((e) => e);

    expect(err).toBeInstanceOf(TokenExpiredError);
    expect(err.reconnectRequired).toBe(true);
    expect(statuses.at(-1)?.status).toBe("EXPIRED");
  });

  it("validates granted scopes", () => {
    const { persistence } = fakePersistence();
    const { provider } = createMockProvider();
    const m = manager(persistence);

    expect(() =>
      m.assertScopes(provider, { accessToken: "a", scope: "read write" }),
    ).not.toThrow();
    expect(() => m.assertScopes(provider, { accessToken: "a", scope: "read" })).toThrow(
      ScopeError,
    );
  });

  it("reports which scopes are missing", () => {
    const { persistence } = fakePersistence();
    const { provider } = createMockProvider();
    try {
      manager(persistence).assertScopes(provider, { accessToken: "a", scope: "read" });
      expect.unreachable();
    } catch (e) {
      expect((e as ScopeError).missingScopes).toEqual(["write"]);
    }
  });
});
