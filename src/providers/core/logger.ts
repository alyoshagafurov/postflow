/**
 * Structured logging for the provider layer.
 *
 * Emits single-line JSON with a stable shape so logs are grepable/queryable in
 * Railway (or any log drain). Domains map to the areas the spec calls out:
 * oauth, publishing, refresh, webhook, api, retry, ratelimit.
 *
 * Secrets are redacted defensively — never log a raw token, code, or secret.
 */

export type LogDomain =
  | "oauth"
  | "publishing"
  | "refresh"
  | "webhook"
  | "api"
  | "retry"
  | "ratelimit"
  | "token"
  | "provider";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  /** Derive a logger that always includes `ctx`. */
  child(ctx: LogContext): Logger;
}

const REDACT = /(token|secret|authorization|client_secret|code|password|verifier|signature)/i;
const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const v = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVELS[v] ?? LEVELS.info;
}

function redact(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (REDACT.test(k)) {
      out[k] = "[redacted]";
    } else if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = redact(v as LogContext);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(
  level: LogLevel,
  domain: LogDomain,
  base: LogContext,
  msg: string,
  ctx?: LogContext,
) {
  if (LEVELS[level] < minLevel()) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    domain,
    msg,
    ...redact({ ...base, ...(ctx ?? {}) }),
  });
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
    line,
  );
}

export function createLogger(domain: LogDomain, base: LogContext = {}): Logger {
  return {
    debug: (m, c) => emit("debug", domain, base, m, c),
    info: (m, c) => emit("info", domain, base, m, c),
    warn: (m, c) => emit("warn", domain, base, m, c),
    error: (m, c) => emit("error", domain, base, m, c),
    child: (c) => createLogger(domain, { ...base, ...c }),
  };
}

/** A no-op logger for tests / pure contexts. */
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
};
