/** Shared Google OAuth2 client + YouTube API handle. */
import { youtube } from "@googleapis/youtube";
import { OAuth2Client } from "google-auth-library";
import { youtubeConfig as cfg } from "./config";
import type { TokenSet } from "../core/types";

export function googleClient(redirectUri?: string): OAuth2Client {
  const creds = cfg.credentials();
  return new OAuth2Client({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri,
  });
}

export function clientWithTokens(tokens: TokenSet): OAuth2Client {
  const client = googleClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiresAt ? tokens.expiresAt.getTime() : undefined,
    scope: tokens.scope ?? undefined,
  });
  return client;
}

// @googleapis/youtube bundles its own google-auth-library copy; the OAuth2Client
// shapes are identical at runtime, so we cast across the duplicated type decls.
export function ytApi(client: OAuth2Client) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return youtube({ version: "v3", auth: client as any });
}
