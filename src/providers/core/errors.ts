/**
 * Unified provider error hierarchy.
 *
 * Every provider maps its platform-specific API failures into one of these, so
 * the application (worker, routes, UI) only ever reasons about a small, stable
 * set of error codes — never about Graph API / TikTok / Google error shapes.
 */

export type ProviderErrorCode =
  | "AUTHENTICATION"
  | "SCOPE"
  | "TOKEN_EXPIRED"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "NETWORK"
  | "PUBLISHING"
  | "MEDIA"
  | "WEBHOOK"
  | "CONFIG"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export interface ProviderErrorInit {
  code?: ProviderErrorCode;
  provider?: string;
  /** Whether a retry could plausibly succeed (network blips, 5xx, rate limits). */
  retryable?: boolean;
  /** Upstream HTTP status, when the error came from an API call. */
  status?: number;
  /** Original error / payload for logs (never shown to users). */
  cause?: unknown;
  details?: Record<string, unknown>;
}

/** Base class for every error surfaced by the provider layer. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider?: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, init: ProviderErrorInit = {}) {
    super(message);
    this.name = new.target.name;
    this.code = init.code ?? "UNKNOWN";
    this.provider = init.provider;
    this.retryable = init.retryable ?? false;
    this.status = init.status;
    this.details = init.details;
    if (init.cause !== undefined) {
      // Preserve the underlying cause without leaking it into the message.
      (this as { cause?: unknown }).cause = init.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** A safe, user-facing (Russian) message. Never leaks tokens or raw payloads. */
  toUserMessage(): string {
    switch (this.code) {
      case "AUTHENTICATION":
        return "Не удалось авторизоваться. Переподключите аккаунт.";
      case "SCOPE":
        return "Недостаточно разрешений. Переподключите аккаунт и выдайте все запрошенные права.";
      case "TOKEN_EXPIRED":
        return "Срок действия доступа истёк. Переподключите аккаунт.";
      case "PERMISSION_DENIED":
        return "Платформа отклонила действие: недостаточно прав.";
      case "RATE_LIMITED":
        return "Слишком много запросов к платформе. Повторим автоматически чуть позже.";
      case "NETWORK":
        return "Сеть недоступна при обращении к платформе. Повторим автоматически.";
      case "MEDIA":
        return "Не удалось обработать медиа для публикации.";
      case "PUBLISHING":
        return "Не удалось опубликовать. " + this.message;
      case "WEBHOOK":
        return "Ошибка обработки уведомления от платформы.";
      case "CONFIG":
        return "Интеграция не настроена.";
      case "NOT_IMPLEMENTED":
        return "Эта платформа ещё не поддерживается для данного действия.";
      default:
        return this.message || "Неизвестная ошибка.";
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      provider: this.provider,
      retryable: this.retryable,
      status: this.status,
      message: this.message,
      details: this.details,
    };
  }
}

export class AuthenticationError extends ProviderError {
  constructor(message = "Authentication failed", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "AUTHENTICATION" });
  }
}

export class ScopeError extends ProviderError {
  /** OAuth scopes that were requested/required but not granted. */
  readonly missingScopes: string[];
  constructor(
    message = "Invalid or insufficient scopes",
    init: ProviderErrorInit & { missingScopes?: string[] } = {},
  ) {
    super(message, { retryable: false, ...init, code: "SCOPE" });
    this.missingScopes = init.missingScopes ?? [];
  }
}

export class TokenExpiredError extends ProviderError {
  /** When true, no refresh token is available and the user must reconnect. */
  readonly reconnectRequired: boolean;
  constructor(
    message = "Access token expired",
    init: ProviderErrorInit & { reconnectRequired?: boolean } = {},
  ) {
    super(message, { retryable: false, ...init, code: "TOKEN_EXPIRED" });
    this.reconnectRequired = init.reconnectRequired ?? false;
  }
}

export class PermissionDeniedError extends ProviderError {
  constructor(message = "Permission denied", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "PERMISSION_DENIED" });
  }
}

export class RateLimitedError extends ProviderError {
  /** How long to wait before retrying, in ms (from Retry-After when available). */
  readonly retryAfterMs: number;
  constructor(
    message = "Rate limited",
    init: ProviderErrorInit & { retryAfterMs?: number } = {},
  ) {
    super(message, { retryable: true, ...init, code: "RATE_LIMITED" });
    this.retryAfterMs = init.retryAfterMs ?? 0;
  }
}

export class NetworkError extends ProviderError {
  constructor(message = "Network error", init: ProviderErrorInit = {}) {
    super(message, { retryable: true, ...init, code: "NETWORK" });
  }
}

export class PublishingError extends ProviderError {
  constructor(message = "Publishing failed", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "PUBLISHING" });
  }
}

export class MediaError extends ProviderError {
  constructor(message = "Media processing failed", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "MEDIA" });
  }
}

export class WebhookError extends ProviderError {
  constructor(message = "Webhook verification failed", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "WEBHOOK" });
  }
}

export class ConfigError extends ProviderError {
  constructor(message = "Provider not configured", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "CONFIG" });
  }
}

export class NotImplementedError extends ProviderError {
  constructor(message = "Not implemented", init: ProviderErrorInit = {}) {
    super(message, { retryable: false, ...init, code: "NOT_IMPLEMENTED" });
  }
}

/** Type guard. */
export function isProviderError(e: unknown): e is ProviderError {
  return e instanceof ProviderError;
}

/** Whether an arbitrary thrown value should be retried by {@link withRetry}. */
export function isRetryableError(e: unknown): boolean {
  if (e instanceof ProviderError) return e.retryable;
  // Unknown/native network errors (fetch failures) are worth one more try.
  return e instanceof TypeError;
}
