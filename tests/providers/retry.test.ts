import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  NetworkError,
  RateLimitedError,
} from "@/providers/core/errors";
import { nullLogger } from "@/providers/core/logger";
import { backoffDelay, withRetry } from "@/providers/core/retry";

const opts = { logger: nullLogger, baseDelayMs: 1, maxDelayMs: 5 };

describe("withRetry", () => {
  it("returns the first successful result without retrying", async () => {
    let calls = 0;
    const out = await withRetry(async () => {
      calls++;
      return "ok";
    }, opts);
    expect(out).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries retryable errors and eventually succeeds", async () => {
    let calls = 0;
    const out = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new NetworkError("blip");
      return "recovered";
    }, opts);
    expect(out).toBe("recovered");
    expect(calls).toBe(3);
  });

  it("does NOT retry non-retryable errors", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new AuthenticationError("bad token");
      }, opts),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(calls).toBe(1);
  });

  it("gives up after the retry budget and rethrows the last error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new NetworkError("down");
        },
        { ...opts, retries: 2 },
      ),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(calls).toBe(3); // initial + 2 retries
  });

  it("honours the rate-limit retry-after hint", async () => {
    let calls = 0;
    const started = Date.now();
    const out = await withRetry(async () => {
      calls++;
      if (calls === 1) throw new RateLimitedError("slow down", { retryAfterMs: 40 });
      return "ok";
    }, opts);
    expect(out).toBe("ok");
    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
  });

  it("grows the delay exponentially and caps it", () => {
    const cfg = { baseDelayMs: 100, factor: 2, maxDelayMs: 1000, jitter: false };
    expect(backoffDelay(0, cfg)).toBe(100);
    expect(backoffDelay(1, cfg)).toBe(200);
    expect(backoffDelay(2, cfg)).toBe(400);
    expect(backoffDelay(10, cfg)).toBe(1000); // capped
  });
});
