/**
 * Instagram — "Instagram API with Instagram Login" (the current, non-deprecated
 * flow). No Facebook Page dependency, no deprecated `instagram_basic` /
 * `instagram_content_publish` scopes. Changing the API version is a one-line
 * edit here.
 */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import type { ProviderConfig } from "../core/types";

// Latest documented Graph version (Meta content-publishing docs show v25.0 as
// of 2026-07). Override with INSTAGRAM_API_VERSION when Meta ships a new one —
// a one-variable change, no code edit.
const API_VERSION = process.env.INSTAGRAM_API_VERSION || "v25.0";
const GRAPH = `https://graph.instagram.com/${API_VERSION}`;

export const instagramConfig: ProviderConfig = {
  id: "instagram",
  label: "Instagram",
  color: "#E1306C",
  apiVersion: API_VERSION,
  baseUrl: GRAPH,
  // Instagram Login (NOT facebook.com/dialog/oauth).
  authUrl: "https://www.instagram.com/oauth/authorize",
  tokenUrl: "https://api.instagram.com/oauth/access_token",
  // Least privilege: request ONLY what PostFlow actually exercises (publishing).
  // manage_comments / manage_messages are valid scopes but unused here — asking
  // for them enlarges App Review and fails least-privilege. Add them back the
  // day a comments/DM feature ships (flip the capability + re-add the scope).
  scopes: ["instagram_business_basic", "instagram_business_content_publish"],
  // Capabilities reflect what is actually IMPLEMENTED, so the UI never offers a
  // feature that would fail. Reels/image publishing + our own scheduling.
  capabilities: defineCapabilities({
    video: true,
    image: true,
    reels: true,
    scheduling: true,
  }),
  usesPkce: false,
  // Instagram long-lived tokens self-refresh (no separate refresh_token).
  selfRefreshing: true,
  reviewEnvFlag: "INSTAGRAM_APPROVED",
  endpoints: {
    graph: GRAPH,
    longLivedToken: "https://graph.instagram.com/access_token",
    refreshToken: "https://graph.instagram.com/refresh_access_token",
  },
  // The Instagram app's own credentials; fall back to the Meta app values so
  // existing single-app setups keep working.
  credentials: credentialsReader({
    clientId: ["INSTAGRAM_APP_ID", "META_APP_ID"],
    clientSecret: ["INSTAGRAM_APP_SECRET", "META_APP_SECRET"],
  }),
};
