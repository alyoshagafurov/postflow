/**
 * Retry with exponential backoff + jitter.
 *
 * Retries only errors that are marked retryable (network blips, 5xx, rate
 * limits). Honours {@link RateLimitedError.retryAfterMs} when the platform tells
 * us how long to wait, and is abortable via an AbortSignal.
 */
import { RateLimitedError, isRetryableError } from "./errors";
import { nullLogger, type Logger } from "./logger";

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  /** Randomised 0..1 fraction added to each delay to avoid thundering herds. */
  jitter?: boolean;
  signal?: AbortSignal;
  logger?: Logger;
  /** Override which errors are retryable (defaults to the unified-error rule). */
  isRetryable?: (error: unknown, attempt: number) => boolean;
}

const DEFAULTS = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 20_000,
  factor: 2,
  jitter: true,
};

export function backoffDelay(
  attempt: number,
  opts: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "factor" | "jitter"> = {},
): number {
  const base = opts.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const factor = opts.factor ?? DEFAULTS.factor;
  const max = opts.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const raw = Math.min(max, base * Math.pow(factor, attempt));
  const jitter = (opts.jitter ?? DEFAULTS.jitter) ? Math.random() * base : 0;
  return Math.round(raw + jitter);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? DEFAULTS.retries;
  const logger = opts.logger ?? nullLogger;
  const retryable = opts.isRetryable ?? ((e: unknown) => isRetryableError(e));

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && retryable(error, attempt);
      if (!canRetry) throw error;

      const wait =
        error instanceof RateLimitedError && error.retryAfterMs > 0
          ? error.retryAfterMs
          : backoffDelay(attempt, opts);

      logger.warn("retrying after error", {
        attempt: attempt + 1,
        retries,
        waitMs: wait,
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(wait, opts.signal);
    }
  }
  throw lastError;
}
