/** X / Twitter — scaffold. OAuth2 + PKCE; publishing TODO. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.TWITTER_API_VERSION || "2";

export const twitterConfig: ProviderConfig = {
  id: "twitter",
  label: "X (Twitter)",
  color: "#000000",
  apiVersion: API_VERSION,
  baseUrl: `https://api.twitter.com/${API_VERSION}`,
  authUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  capabilities: defineCapabilities({ video: true, image: true }),
  usesPkce: true,
  credentials: credentialsReader({
    clientId: "TWITTER_CLIENT_ID",
    clientSecret: "TWITTER_CLIENT_SECRET",
  }),
};

export const twitterProvider = createScaffoldProvider(twitterConfig);
