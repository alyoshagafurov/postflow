/**
 * HTTP client for provider API calls.
 *
 * Centralises timeout, structured logging, and — crucially — the mapping from
 * transport/HTTP failures to the unified error hierarchy. Providers use this
 * (or `postForm`) so error handling is identical everywhere.
 */
import {
  AuthenticationError,
  NetworkError,
  PermissionDeniedError,
  ProviderError,
  RateLimitedError,
  ScopeError,
} from "./errors";
import { nullLogger, type Logger } from "./logger";

export interface ApiFetchOptions extends Omit<RequestInit, "signal"> {
  provider?: string;
  logger?: Logger;
  timeoutMs?: number;
  /** Parse response as json (default) or text. */
  parse?: "json" | "text";
  /** Given a parsed body, decide if the platform reported a logical error. */
  detectError?: (body: unknown, res: Response) => string | null;
}

function parseRetryAfter(res: Response): number {
  const h = res.headers.get("retry-after");
  if (!h) return 0;
  const secs = Number(h);
  if (!Number.isNaN(secs)) return secs * 1000;
  const date = Date.parse(h);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}

function mapStatus(
  status: number,
  provider: string | undefined,
  message: string,
  res: Response,
): ProviderError {
  if (status === 401) {
    return new AuthenticationError(message, { provider, status });
  }
  if (status === 403) {
    // Some platforms use 403 for missing scopes vs. plain permission denial.
    return /scope|permission|insufficient/i.test(message)
      ? new ScopeError(message, { provider, status })
      : new PermissionDeniedError(message, { provider, status });
  }
  if (status === 429) {
    return new RateLimitedError(message, {
      provider,
      status,
      retryAfterMs: parseRetryAfter(res),
    });
  }
  if (status >= 500) {
    return new NetworkError(message, { provider, status });
  }
  // Generic 4xx from a provider API — keep the neutral default code rather than
  // mislabelling every one as a publishing failure.
  return new ProviderError(message, { provider, status });
}

export async function apiFetch<T = unknown>(
  url: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const {
    provider,
    logger = nullLogger,
    timeoutMs = 30_000,
    parse = "json",
    detectError,
    ...init
  } = opts;

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === "TimeoutError";
    logger.error("api request failed", {
      provider,
      url: redactUrl(url),
      aborted,
    });
    throw new NetworkError(aborted ? "Request timed out" : "Network request failed", {
      provider,
      cause,
    });
  }

  const body =
    parse === "text" ? await res.text() : await res.json().catch(() => ({}));

  const logicalError = detectError ? detectError(body, res) : null;
  const durationMs = Date.now() - started;

  if (!res.ok || logicalError) {
    const message =
      logicalError ??
      jsonErrorMessage(body) ??
      `HTTP ${res.status} ${res.statusText}`;
    logger.warn("api error", {
      provider,
      url: redactUrl(url),
      status: res.status,
      durationMs,
      message,
    });
    throw mapStatus(res.status || 400, provider, message, res);
  }

  logger.debug("api ok", {
    provider,
    url: redactUrl(url),
    status: res.status,
    durationMs,
  });
  return body as T;
}

/** application/x-www-form-urlencoded POST — common for OAuth token endpoints. */
export async function postForm<T = unknown>(
  url: string,
  params: Record<string, string>,
  opts: ApiFetchOptions = {},
): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    ...opts,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(opts.headers ?? {}),
    },
    body: new URLSearchParams(params).toString(),
  });
}

/**
 * Extract a human-readable message from a JSON error body. Single source of
 * error extraction across the layer — covers the Graph shape
 * (`error.message` / `error.error_message`), the OAuth2 standard
 * (`error_description`), and the Instagram Login OAuth shape (`error_message`).
 */
export function jsonErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = body as Record<string, any>;
  return (
    b.error?.message ??
    b.error?.error_message ??
    b.error_description ??
    b.error_message ??
    (typeof b.error === "string" ? b.error : null) ??
    b.message ??
    null
  );
}

/** Strip query strings (may carry access_token) before logging a URL. */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}
