/**
 * The universal provider contract.
 *
 * Every social network implements the SAME set of interfaces. The application
 * (connect routes, worker, UI) depends ONLY on these types — never on a
 * platform's concrete API. Adding a network = implementing these in a new
 * folder and registering it. No business logic changes.
 */
import type { CapabilityMap } from "./capabilities";
import type { Logger } from "./logger";

export type ProviderId = string;

/** Detected nature of a connected account — drives publishing rules. */
export type AccountType = "personal" | "creator" | "business" | "unknown";

export type AccountStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_VERIFICATION";

/** A set of tokens for one connected account. Provider-agnostic. */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  tokenType?: string | null;
  /** Provider-specific extras needed for API calls (e.g. Page tokens, open_id). */
  meta?: Record<string, unknown>;
}

/** A profile normalised across every platform. */
export interface NormalizedProfile {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accountType?: AccountType;
  raw?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthorizeRequest {
  redirectUri: string;
  /** Signed anti-CSRF state (see core/oauth). */
  state: string;
  /** Override the provider's default scopes. */
  scopes?: string[];
  /** PKCE challenge when the provider uses it. */
  pkce?: { challenge: string; method: "S256" | "plain" };
  extra?: Record<string, string>;
}

export interface ExchangeRequest {
  code: string;
  redirectUri: string;
  /** PKCE verifier, echoed back from the authorize step. */
  pkceVerifier?: string;
}

export interface ExchangeResult {
  tokens: TokenSet;
  profile: NormalizedProfile;
}

/**
 * OAuth / authentication surface. Every method is platform-specific internally
 * but uniform externally.
 */
export interface AuthProvider {
  getAuthorizationUrl(req: AuthorizeRequest): string;
  exchangeCode(req: ExchangeRequest): Promise<ExchangeResult>;
  refreshToken(tokens: TokenSet): Promise<TokenSet>;
  revoke(tokens: TokenSet): Promise<void>;
  validateToken(tokens: TokenSet): Promise<boolean>;
  fetchProfile(tokens: TokenSet): Promise<NormalizedProfile>;
  fetchCapabilities(tokens: TokenSet, profile?: NormalizedProfile): Promise<CapabilityMap>;
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export type MediaKind = "video" | "image";

export interface MediaAsset {
  kind: MediaKind;
  /** Object key in our own storage (S3/R2 or disk). */
  key: string;
  mime?: string | null;
}

/** Resolves our storage keys to the form a provider needs. Injected so
 *  providers never import `@/lib/storage` directly (keeps them testable). */
export interface MediaResolver {
  publicUrl(key: string): string;
  localPath(key: string): Promise<{ path: string; cleanup: () => Promise<void> }>;
}

export interface PublishInput {
  title: string;
  caption: string;
  description: string;
  tags: string[];
  privacy: "public" | "private" | "unlisted";
  media: MediaAsset;
  publishNow: boolean;
  scheduledAt?: Date | null;
}

/** Everything a provider needs about the destination account at publish time. */
export interface PublishContext {
  /** Platform account id (channel id / ig user id / open id). */
  accountId: string;
  accountType?: AccountType;
  /** Provider extras persisted at connect time (page id, ig id, …). */
  targetMeta?: Record<string, unknown>;
  media: MediaResolver;
  logger: Logger;
}

export type PublishState = "PUBLISHED" | "PROCESSING" | "SCHEDULED" | "FAILED";

export interface PublishResult {
  platformPostId: string;
  platformUrl?: string | null;
  state: PublishState;
  raw?: Record<string, unknown>;
}

export interface PublishStatusResult {
  state: PublishState;
  platformUrl?: string | null;
  error?: string;
}

/**
 * Publishing surface. `publish`/`getStatus` are mandatory; the rest are
 * optional and gated by capabilities.
 */
export interface Publisher {
  publish(
    tokens: TokenSet,
    input: PublishInput,
    ctx: PublishContext,
  ): Promise<PublishResult>;
  getStatus(tokens: TokenSet, platformPostId: string): Promise<PublishStatusResult>;
  delete?(tokens: TokenSet, platformPostId: string, ctx: PublishContext): Promise<void>;
  update?(
    tokens: TokenSet,
    platformPostId: string,
    patch: Partial<PublishInput>,
    ctx: PublishContext,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface WebhookHandler {
  verifySignature(rawBody: string, headers: Record<string, string>): boolean;
  handle(event: unknown): Promise<void>;
}

// ---------------------------------------------------------------------------
// Config & the composed provider
// ---------------------------------------------------------------------------

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
  extra?: Record<string, string>;
}

/**
 * All platform constants live here — versions, endpoints, scopes, capabilities.
 * Changing an API version is a ONE-file edit (the provider's config).
 */
export interface ProviderConfig {
  id: ProviderId;
  label: string;
  color: string;
  apiVersion: string;
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  capabilities: CapabilityMap;
  usesPkce: boolean;
  /**
   * Token self-refreshes by re-presenting the current access token (no separate
   * refresh_token). Instagram long-lived tokens work this way. The TokenManager
   * uses this to decide whether an absent refresh token means "reconnect".
   */
  selfRefreshing?: boolean;
  /** Name of the env flag that flips accounts ACTIVE after app review. */
  reviewEnvFlag?: string;
  /** Extra named endpoints (graph paths, long-lived token url, etc.). */
  endpoints?: Record<string, string>;
  /** Reads client id/secret from env at call time. */
  credentials(): ProviderCredentials;
}

/** A fully-composed provider: config + auth + publisher (+ optional webhooks). */
export interface SocialProvider {
  readonly id: ProviderId;
  readonly config: ProviderConfig;
  readonly auth: AuthProvider;
  readonly publisher: Publisher;
  readonly webhooks?: WebhookHandler;
  /** Credentials present in env. */
  isConfigured(): boolean;
  /** Connected accounts must await platform app review before posting. */
  requiresReview(): boolean;
  capabilities(): CapabilityMap;
}
