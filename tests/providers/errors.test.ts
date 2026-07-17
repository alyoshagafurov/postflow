import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  MediaError,
  NetworkError,
  NotImplementedError,
  PermissionDeniedError,
  ProviderError,
  PublishingError,
  RateLimitedError,
  ScopeError,
  TokenExpiredError,
  WebhookError,
  isProviderError,
  isRetryableError,
} from "@/providers/core/errors";

describe("unified error hierarchy", () => {
  it("assigns the right code to each error type", () => {
    expect(new AuthenticationError().code).toBe("AUTHENTICATION");
    expect(new ScopeError().code).toBe("SCOPE");
    expect(new TokenExpiredError().code).toBe("TOKEN_EXPIRED");
    expect(new PermissionDeniedError().code).toBe("PERMISSION_DENIED");
    expect(new RateLimitedError().code).toBe("RATE_LIMITED");
    expect(new NetworkError().code).toBe("NETWORK");
    expect(new PublishingError().code).toBe("PUBLISHING");
    expect(new MediaError().code).toBe("MEDIA");
    expect(new WebhookError().code).toBe("WEBHOOK");
    expect(new NotImplementedError().code).toBe("NOT_IMPLEMENTED");
  });

  it("marks only transient failures as retryable", () => {
    expect(new NetworkError().retryable).toBe(true);
    expect(new RateLimitedError().retryable).toBe(true);
    expect(new AuthenticationError().retryable).toBe(false);
    expect(new ScopeError().retryable).toBe(false);
    expect(new PublishingError().retryable).toBe(false);
  });

  it("keeps every error an instanceof ProviderError and Error", () => {
    const e = new ScopeError("nope");
    expect(e).toBeInstanceOf(ScopeError);
    expect(e).toBeInstanceOf(ProviderError);
    expect(e).toBeInstanceOf(Error);
    expect(isProviderError(e)).toBe(true);
    expect(e.name).toBe("ScopeError");
  });

  it("carries provider, status and structured details", () => {
    const e = new PermissionDeniedError("denied", {
      provider: "instagram",
      status: 403,
      details: { hint: "reconnect" },
    });
    expect(e.provider).toBe("instagram");
    expect(e.status).toBe(403);
    expect(e.toJSON()).toMatchObject({
      name: "PermissionDeniedError",
      code: "PERMISSION_DENIED",
      provider: "instagram",
      status: 403,
    });
  });

  it("exposes scope + reconnect metadata", () => {
    expect(new ScopeError("x", { missingScopes: ["a", "b"] }).missingScopes).toEqual([
      "a",
      "b",
    ]);
    expect(new TokenExpiredError("x", { reconnectRequired: true }).reconnectRequired).toBe(
      true,
    );
    expect(new RateLimitedError("x", { retryAfterMs: 500 }).retryAfterMs).toBe(500);
  });

  it("produces safe user-facing messages that never leak internals", () => {
    const msg = new AuthenticationError("token abc123 rejected by upstream").toUserMessage();
    expect(msg).not.toContain("abc123");
    expect(msg.length).toBeGreaterThan(0);
    expect(new TokenExpiredError().toUserMessage()).toContain("Переподключите");
  });

  it("classifies retryability for unknown throwables", () => {
    expect(isRetryableError(new NetworkError())).toBe(true);
    expect(isRetryableError(new AuthenticationError())).toBe(false);
    expect(isRetryableError(new TypeError("fetch failed"))).toBe(true);
    expect(isRetryableError("some string")).toBe(false);
  });
});
