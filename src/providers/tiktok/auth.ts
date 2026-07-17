/** TikTok OAuth (uses `client_key`, not `client_id`). */
import { AuthenticationError } from "../core/errors";
import { apiFetch, postForm } from "../core/http";
import { buildAuthorizeUrl, joinScopes } from "../core/oauth";
import type {
  AuthProvider,
  AuthorizeRequest,
  ExchangeRequest,
  NormalizedProfile,
  TokenSet,
} from "../core/types";
import { tiktokConfig as cfg } from "./config";

interface TikTokToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  open_id: string;
  error?: string;
  error_description?: string;
}

function tokenError(body: unknown): string | null {
  const b = body as TikTokToken;
  return b?.error ? b.error_description || b.error : null;
}

async function fetchProfile(tokens: TokenSet): Promise<NormalizedProfile> {
  const url = new URL(cfg.endpoints!.userInfo);
  url.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");
  const data = await apiFetch<{
    data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } };
  }>(url.toString(), {
    provider: cfg.id,
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  const u = data.data?.user ?? {};
  return {
    id: u.open_id ?? (tokens.meta?.openId as string) ?? "",
    username: u.display_name ?? null,
    displayName: u.display_name ?? null,
    avatarUrl: u.avatar_url ?? null,
    accountType: "creator",
    raw: u,
  };
}

export const tiktokAuth: AuthProvider = {
  getAuthorizationUrl(req: AuthorizeRequest): string {
    const creds = cfg.credentials();
    return buildAuthorizeUrl(cfg.authUrl, {
      client_key: creds.clientId,
      scope: joinScopes(req.scopes ?? cfg.scopes, ","),
      response_type: "code",
      redirect_uri: req.redirectUri,
      state: req.state,
    });
  },

  async exchangeCode(req: ExchangeRequest) {
    const creds = cfg.credentials();
    const token = await postForm<TikTokToken>(cfg.tokenUrl, {
      client_key: creds.clientId,
      client_secret: creds.clientSecret,
      code: req.code,
      grant_type: "authorization_code",
      redirect_uri: req.redirectUri,
    }, { provider: cfg.id, detectError: tokenError });

    if (!token.access_token) {
      throw new AuthenticationError("TikTok: no access token", { provider: cfg.id });
    }

    const tokens: TokenSet = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? null,
      meta: { openId: token.open_id },
    };
    const profile = await fetchProfile(tokens);
    return { tokens, profile };
  },

  async refreshToken(tokens: TokenSet): Promise<TokenSet> {
    if (!tokens.refreshToken) {
      throw new AuthenticationError("TikTok: no refresh token", { provider: cfg.id });
    }
    const creds = cfg.credentials();
    const token = await postForm<TikTokToken>(cfg.tokenUrl, {
      client_key: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }, { provider: cfg.id, detectError: tokenError });
    return {
      ...tokens,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? tokens.refreshToken,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? tokens.scope ?? null,
    };
  },

  async revoke(): Promise<void> {
    // TikTok token revocation is done via the developer portal.
  },

  async validateToken(tokens: TokenSet): Promise<boolean> {
    try {
      await fetchProfile(tokens);
      return true;
    } catch {
      return false;
    }
  },

  fetchProfile,

  async fetchCapabilities() {
    return cfg.capabilities;
  },
};
