/** YouTube/Google OAuth — uses google-auth-library for the token dance. */
import { AuthenticationError } from "../core/errors";
import type {
  AuthProvider,
  AuthorizeRequest,
  ExchangeRequest,
  NormalizedProfile,
  TokenSet,
} from "../core/types";
import { youtubeConfig as cfg } from "./config";
import { clientWithTokens, googleClient, ytApi } from "./client";

async function fetchProfile(tokens: TokenSet): Promise<NormalizedProfile> {
  const yt = ytApi(clientWithTokens(tokens));
  const res = await yt.channels.list({
    part: ["snippet", "contentDetails"],
    mine: true,
  });
  const channel = res.data.items?.[0];
  if (!channel?.id) {
    throw new AuthenticationError("YouTube channel not found", { provider: cfg.id });
  }
  return {
    id: channel.id,
    username: channel.snippet?.customUrl ?? channel.snippet?.title ?? null,
    displayName: channel.snippet?.title ?? null,
    avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
    accountType: "creator",
    raw: { channelId: channel.id },
  };
}

function toTokenSet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  prev?: TokenSet,
): TokenSet {
  return {
    accessToken: t.access_token ?? prev?.accessToken ?? "",
    refreshToken: t.refresh_token ?? prev?.refreshToken ?? null,
    expiresAt: t.expiry_date ? new Date(t.expiry_date) : prev?.expiresAt ?? null,
    scope: t.scope ?? prev?.scope ?? null,
    tokenType: t.token_type ?? "Bearer",
  };
}

export const youtubeAuth: AuthProvider = {
  getAuthorizationUrl(req: AuthorizeRequest): string {
    const client = googleClient(req.redirectUri);
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: req.scopes ?? cfg.scopes,
      state: req.state,
    });
  },

  async exchangeCode(req: ExchangeRequest) {
    const client = googleClient(req.redirectUri);
    const { tokens } = await client.getToken(req.code);
    const tokenSet = toTokenSet(tokens);
    const profile = await fetchProfile(tokenSet);
    return { tokens: tokenSet, profile };
  },

  async refreshToken(tokens: TokenSet): Promise<TokenSet> {
    if (!tokens.refreshToken) {
      throw new AuthenticationError("YouTube: no refresh token", { provider: cfg.id });
    }
    const client = googleClient();
    client.setCredentials({ refresh_token: tokens.refreshToken });
    await client.getAccessToken();
    return toTokenSet(client.credentials, tokens);
  },

  async revoke(tokens: TokenSet): Promise<void> {
    try {
      await clientWithTokens(tokens).revokeCredentials();
    } catch {
      // best-effort
    }
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
