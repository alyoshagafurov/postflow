/** YouTube Data API v3. Version/endpoints/scopes centralised here. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.YOUTUBE_API_VERSION || "v3";

export const youtubeConfig: ProviderConfig = {
  id: "youtube",
  label: "YouTube",
  color: "#FF0033",
  apiVersion: API_VERSION,
  baseUrl: `https://www.googleapis.com/youtube/${API_VERSION}`,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  capabilities: defineCapabilities({
    video: true,
    shorts: true,
    comments: true,
    analytics: true,
    scheduling: true,
  }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "GOOGLE_CLIENT_ID",
    clientSecret: "GOOGLE_CLIENT_SECRET",
  }),
};
