/**
 * Reusable building blocks for standard OAuth2 authorization-code providers.
 *
 * Most networks share the same authorize/token dance; this removes the
 * boilerplate so a provider's file focuses on what's actually unique
 * (profile shape, publishing). Providers may use this or hand-roll their auth.
 */
import { NotImplementedError } from "./errors";
import { buildAuthorizeUrl, joinScopes } from "./oauth";
import { postForm } from "./http";
import type {
  AuthProvider,
  AuthorizeRequest,
  ExchangeRequest,
  NormalizedProfile,
  ProviderConfig,
  TokenSet,
} from "./types";
import type { CapabilityMap } from "./capabilities";

export interface OAuth2AuthOptions {
  config: ProviderConfig;
  /** Scope separator — space (default) or comma (Meta/Instagram/TikTok). */
  scopeSeparator?: string;
  /** Extra static params added to the authorize URL. */
  authorizeExtras?: Record<string, string>;
  /** Map a raw token response to a normalized profile (provider-specific). */
  fetchProfile: (tokens: TokenSet) => Promise<NormalizedProfile>;
  /** Optional capability probe (defaults to the static config capabilities). */
  fetchCapabilities?: (
    tokens: TokenSet,
    profile?: NormalizedProfile,
  ) => Promise<CapabilityMap>;
  /** Optional token refresh (defaults to a standard refresh_token grant). */
  refreshToken?: (tokens: TokenSet) => Promise<TokenSet>;
  /** Optional revoke. */
  revoke?: (tokens: TokenSet) => Promise<void>;
  /** Optional live validation (defaults to fetchProfile succeeding). */
  validateToken?: (tokens: TokenSet) => Promise<boolean>;
  /** Map a raw token endpoint response to a TokenSet. */
  mapTokens?: (raw: Record<string, unknown>) => TokenSet;
}

function defaultMapTokens(raw: Record<string, unknown>): TokenSet {
  const expiresIn = Number(raw.expires_in ?? 0);
  return {
    accessToken: String(raw.access_token ?? ""),
    refreshToken: (raw.refresh_token as string) ?? null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    scope: (raw.scope as string) ?? null,
    tokenType: (raw.token_type as string) ?? null,
  };
}

/** Build a standard OAuth2 AuthProvider from a config + a few provider hooks. */
export function createOAuth2AuthProvider(opts: OAuth2AuthOptions): AuthProvider {
  const { config } = opts;
  const mapTokens = opts.mapTokens ?? defaultMapTokens;
  const sep = opts.scopeSeparator ?? " ";

  return {
    getAuthorizationUrl(req: AuthorizeRequest): string {
      const creds = config.credentials();
      return buildAuthorizeUrl(config.authUrl, {
        client_id: creds.clientId,
        redirect_uri: req.redirectUri,
        response_type: "code",
        scope: joinScopes(req.scopes ?? config.scopes, sep),
        state: req.state,
        code_challenge: req.pkce?.challenge,
        code_challenge_method: req.pkce?.method,
        ...opts.authorizeExtras,
        ...req.extra,
      });
    },

    async exchangeCode(req: ExchangeRequest) {
      const creds = config.credentials();
      const raw = await postForm<Record<string, unknown>>(config.tokenUrl, {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "authorization_code",
        code: req.code,
        redirect_uri: req.redirectUri,
        ...(req.pkceVerifier ? { code_verifier: req.pkceVerifier } : {}),
      }, { provider: config.id });
      const tokens = mapTokens(raw);
      const profile = await opts.fetchProfile(tokens);
      return { tokens, profile };
    },

    async refreshToken(tokens: TokenSet): Promise<TokenSet> {
      if (opts.refreshToken) return opts.refreshToken(tokens);
      if (!tokens.refreshToken) {
        throw new NotImplementedError(`${config.id}: no refresh token`, {
          provider: config.id,
        });
      }
      const creds = config.credentials();
      const raw = await postForm<Record<string, unknown>>(config.tokenUrl, {
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }, { provider: config.id });
      const next = mapTokens(raw);
      return { ...next, refreshToken: next.refreshToken ?? tokens.refreshToken };
    },

    async revoke(tokens: TokenSet): Promise<void> {
      if (opts.revoke) return opts.revoke(tokens);
      // No-op by default; providers with a revoke endpoint override this.
    },

    async validateToken(tokens: TokenSet): Promise<boolean> {
      if (opts.validateToken) return opts.validateToken(tokens);
      try {
        await opts.fetchProfile(tokens);
        return true;
      } catch {
        return false;
      }
    },

    fetchProfile: opts.fetchProfile,

    async fetchCapabilities(tokens, profile): Promise<CapabilityMap> {
      if (opts.fetchCapabilities) return opts.fetchCapabilities(tokens, profile);
      return config.capabilities;
    },
  };
}
