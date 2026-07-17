/**
 * Instagram Login auth flow:
 *   1. authorize on instagram.com
 *   2. exchange code → short-lived token (api.instagram.com)
 *   3. exchange short → long-lived token (~60 days, graph.instagram.com)
 *   4. refresh long-lived tokens before they expire
 *
 * Account type (personal / creator / business) is read from `account_type`
 * so publishing can be configured accordingly.
 */
import { AuthenticationError } from "../core/errors";
import { apiFetch, jsonErrorMessage as graphError, postForm } from "../core/http";
import { buildAuthorizeUrl, joinScopes } from "../core/oauth";
import { defineCapabilities, type CapabilityMap } from "../core/capabilities";
import type {
  AuthProvider,
  AuthorizeRequest,
  ExchangeRequest,
  NormalizedProfile,
  TokenSet,
} from "../core/types";
import { instagramConfig as cfg } from "./config";

interface IgTokenResponse {
  access_token?: string;
  user_id?: string | number;
  permissions?: string;
  // some responses wrap in { data: [...] }
  data?: Array<{ access_token: string; user_id: string | number; permissions?: string }>;
}

interface IgLongLived {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

function mapAccountType(t?: string): NormalizedProfile["accountType"] {
  switch ((t ?? "").toUpperCase()) {
    case "BUSINESS":
      return "business";
    case "MEDIA_CREATOR":
    case "CREATOR":
      return "creator";
    case "PERSONAL":
      return "personal";
    default:
      return "unknown";
  }
}

type IgMe = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
};

async function getMe(tokens: TokenSet, fields: string): Promise<IgMe> {
  const url = new URL(`${cfg.baseUrl}/me`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", tokens.accessToken);
  return apiFetch<IgMe>(url.toString(), { provider: cfg.id, detectError: graphError });
}

async function fetchProfile(tokens: TokenSet): Promise<NormalizedProfile> {
  // `account_type` is not guaranteed across product/version variants of the
  // User node. If Meta rejects the field list, degrade to the always-valid
  // minimal set rather than breaking the whole connection.
  const FULL = "user_id,username,account_type,profile_picture_url,name";
  const MIN = "user_id,username";
  let data: IgMe;
  try {
    data = await getMe(tokens, FULL);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/field|param|#100|nonexisting/i.test(msg)) throw e;
    data = await getMe(tokens, MIN);
  }

  const id = String(data.user_id ?? data.id ?? "");
  if (!id) throw new AuthenticationError("Instagram: profile has no id", { provider: cfg.id });
  return {
    id,
    username: data.username ?? null,
    displayName: data.name ?? data.username ?? null,
    avatarUrl: data.profile_picture_url ?? null,
    accountType: mapAccountType(data.account_type),
    raw: data,
  };
}

export const instagramAuth: AuthProvider = {
  getAuthorizationUrl(req: AuthorizeRequest): string {
    const creds = cfg.credentials();
    // Instagram Login expects comma-separated scopes.
    return buildAuthorizeUrl(cfg.authUrl, {
      client_id: creds.clientId,
      redirect_uri: req.redirectUri,
      response_type: "code",
      scope: joinScopes(req.scopes ?? cfg.scopes, ","),
      state: req.state,
      ...req.extra,
    });
  },

  async exchangeCode(req: ExchangeRequest) {
    const creds = cfg.credentials();
    // 1) code → short-lived token
    const shortRes = await postForm<IgTokenResponse>(cfg.tokenUrl, {
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: req.redirectUri,
      code: req.code,
    }, { provider: cfg.id });
    const short = shortRes.data?.[0] ?? shortRes;
    const shortToken = short.access_token;
    if (!shortToken) {
      throw new AuthenticationError("Instagram: no access token returned", {
        provider: cfg.id,
      });
    }

    // 2) short → long-lived (~60 days)
    const longUrl = new URL(cfg.endpoints!.longLivedToken);
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", creds.clientSecret);
    longUrl.searchParams.set("access_token", shortToken);
    const long = await apiFetch<IgLongLived>(longUrl.toString(), {
      provider: cfg.id,
      detectError: graphError,
    });

    const tokens: TokenSet = {
      accessToken: long.access_token,
      refreshToken: null, // IG long-lived tokens self-refresh (no refresh token)
      expiresAt: long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000)
        : null,
      scope: cfg.scopes.join(","),
      tokenType: long.token_type ?? "bearer",
      meta: { userId: short.user_id },
    };
    const profile = await fetchProfile(tokens);
    return { tokens, profile };
  },

  async refreshToken(tokens: TokenSet): Promise<TokenSet> {
    // Long-lived IG tokens are refreshed by re-presenting the current token.
    const url = new URL(cfg.endpoints!.refreshToken);
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", tokens.accessToken);
    const res = await apiFetch<IgLongLived>(url.toString(), {
      provider: cfg.id,
      detectError: graphError,
    });
    return {
      ...tokens,
      accessToken: res.access_token,
      expiresAt: res.expires_in
        ? new Date(Date.now() + res.expires_in * 1000)
        : null,
    };
  },

  async revoke(): Promise<void> {
    // Instagram has no token-revoke endpoint; users revoke in-app.
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

  async fetchCapabilities(_tokens, profile): Promise<CapabilityMap> {
    // Personal accounts cannot publish via the API at all — expose no
    // capabilities so the UI disables publishing for them.
    if (profile?.accountType === "personal") {
      return defineCapabilities({});
    }
    return cfg.capabilities;
  },
};
