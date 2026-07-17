/**
 * Facebook Page provider: OAuth → long-lived user token → Page token, then
 * publish videos to the selected Page. Page tokens derived from a long-lived
 * user token do not expire, so refresh re-derives the Page token on demand.
 */
import { isConfigured, requiresReview } from "../core/config";
import { AuthenticationError, PublishingError } from "../core/errors";
import { apiFetch, jsonErrorMessage as graphError } from "../core/http";
import { buildAuthorizeUrl, joinScopes } from "../core/oauth";
import type {
  AuthProvider,
  AuthorizeRequest,
  ExchangeRequest,
  NormalizedProfile,
  Publisher,
  PublishContext,
  PublishInput,
  PublishResult,
  PublishStatusResult,
  SocialProvider,
  TokenSet,
} from "../core/types";
import { facebookConfig as cfg } from "./config";

async function firstPage(userToken: string): Promise<{
  id: string;
  name?: string;
  access_token: string;
  picture?: { data?: { url?: string } };
}> {
  const url = new URL(cfg.endpoints!.accounts);
  url.searchParams.set("fields", "name,access_token,id,picture");
  url.searchParams.set("access_token", userToken);
  const res = await apiFetch<{
    data?: Array<{ id: string; name?: string; access_token: string; picture?: { data?: { url?: string } } }>;
  }>(url.toString(), { provider: cfg.id, detectError: graphError });
  const page = res.data?.[0];
  if (!page?.access_token) {
    throw new AuthenticationError("Facebook: no manageable Page found", {
      provider: cfg.id,
    });
  }
  return page;
}

const facebookAuth: AuthProvider = {
  getAuthorizationUrl(req: AuthorizeRequest): string {
    const creds = cfg.credentials();
    return buildAuthorizeUrl(cfg.authUrl, {
      client_id: creds.clientId,
      redirect_uri: req.redirectUri,
      response_type: "code",
      scope: joinScopes(req.scopes ?? cfg.scopes, ","),
      state: req.state,
    });
  },

  async exchangeCode(req: ExchangeRequest) {
    const creds = cfg.credentials();
    // 1) code → short-lived user token
    const shortUrl = new URL(cfg.tokenUrl);
    shortUrl.searchParams.set("client_id", creds.clientId);
    shortUrl.searchParams.set("client_secret", creds.clientSecret);
    shortUrl.searchParams.set("redirect_uri", req.redirectUri);
    shortUrl.searchParams.set("code", req.code);
    const short = await apiFetch<{ access_token?: string }>(shortUrl.toString(), {
      provider: cfg.id,
      detectError: graphError,
    });
    if (!short.access_token) {
      throw new AuthenticationError("Facebook: no access token", { provider: cfg.id });
    }

    // 2) short → long-lived user token
    const longUrl = new URL(cfg.tokenUrl);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", creds.clientId);
    longUrl.searchParams.set("client_secret", creds.clientSecret);
    longUrl.searchParams.set("fb_exchange_token", short.access_token);
    const long = await apiFetch<{ access_token: string; expires_in?: number }>(
      longUrl.toString(),
      { provider: cfg.id, detectError: graphError },
    );

    // 3) resolve the Page token. The long-lived USER token is stored as the
    //    (encrypted) refresh token so it is never persisted in plaintext
    //    metadata; the Page token is re-derived from it on refresh.
    const page = await firstPage(long.access_token);
    const tokens: TokenSet = {
      accessToken: page.access_token,
      refreshToken: long.access_token,
      expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null,
      scope: cfg.scopes.join(","),
      meta: { pageId: page.id },
    };
    const profile: NormalizedProfile = {
      id: page.id,
      username: page.name ?? null,
      displayName: page.name ?? null,
      avatarUrl: page.picture?.data?.url ?? null,
      accountType: "business",
      raw: { pageId: page.id },
    };
    return { tokens, profile };
  },

  async refreshToken(tokens: TokenSet): Promise<TokenSet> {
    const userToken = tokens.refreshToken ?? (tokens.meta?.userToken as string);
    if (!userToken) {
      throw new AuthenticationError("Facebook: no user token to refresh", {
        provider: cfg.id,
      });
    }
    const page = await firstPage(userToken);
    return { ...tokens, accessToken: page.access_token, refreshToken: userToken };
  },

  async revoke(): Promise<void> {},

  async validateToken(tokens: TokenSet): Promise<boolean> {
    try {
      const userToken = tokens.refreshToken ?? tokens.accessToken;
      await firstPage(userToken);
      return true;
    } catch {
      return false;
    }
  },

  async fetchProfile(tokens: TokenSet): Promise<NormalizedProfile> {
    const userToken = tokens.refreshToken ?? tokens.accessToken;
    const page = await firstPage(userToken);
    return {
      id: page.id,
      username: page.name ?? null,
      displayName: page.name ?? null,
      avatarUrl: page.picture?.data?.url ?? null,
      accountType: "business",
    };
  },

  async fetchCapabilities() {
    return cfg.capabilities;
  },
};

const facebookPublisher: Publisher = {
  async publish(
    tokens: TokenSet,
    input: PublishInput,
    ctx: PublishContext,
  ): Promise<PublishResult> {
    const pageId = (ctx.targetMeta?.pageId as string) ?? ctx.accountId;
    const mediaUrl = ctx.media.publicUrl(input.media.key);
    const res = await apiFetch<{ id?: string }>(`${cfg.baseUrl}/${pageId}/videos`, {
      provider: cfg.id,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        file_url: mediaUrl,
        description: input.description || input.caption,
        title: input.title,
        access_token: tokens.accessToken,
      }).toString(),
      detectError: graphError,
    });
    if (!res.id) throw new PublishingError("Facebook: publish failed", { provider: cfg.id });
    return {
      platformPostId: res.id,
      platformUrl: `https://www.facebook.com/${res.id}`,
      state: "PROCESSING",
    };
  },

  async getStatus(
    tokens: TokenSet,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    const url = new URL(`${cfg.baseUrl}/${platformPostId}`);
    url.searchParams.set("fields", "status,permalink_url");
    url.searchParams.set("access_token", tokens.accessToken);
    const info = await apiFetch<{
      status?: { video_status?: string };
      permalink_url?: string;
    }>(url.toString(), { provider: cfg.id, detectError: graphError });
    const s = info.status?.video_status;
    const url2 = info.permalink_url
      ? `https://www.facebook.com${info.permalink_url}`
      : null;
    if (s === "ready") return { state: "PUBLISHED", platformUrl: url2 };
    if (s === "error") return { state: "FAILED", error: "video processing error" };
    return { state: "PROCESSING", platformUrl: url2 };
  },
};

export const facebookProvider: SocialProvider = {
  id: cfg.id,
  config: cfg,
  auth: facebookAuth,
  publisher: facebookPublisher,
  isConfigured: () => isConfigured(cfg),
  requiresReview: () => requiresReview(cfg),
  capabilities: () => cfg.capabilities,
};
