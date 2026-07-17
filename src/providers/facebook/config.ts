/** Facebook Pages (Graph API) — video publishing to a Page. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.FACEBOOK_API_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

export const facebookConfig: ProviderConfig = {
  id: "facebook",
  label: "Facebook",
  color: "#1877F2",
  apiVersion: API_VERSION,
  baseUrl: GRAPH,
  authUrl: `https://www.facebook.com/${API_VERSION}/dialog/oauth`,
  tokenUrl: `${GRAPH}/oauth/access_token`,
  scopes: [
    "public_profile",
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
    "business_management",
  ],
  capabilities: defineCapabilities({
    video: true,
    image: true,
    livestream: true,
    comments: true,
    analytics: true,
    scheduling: true,
  }),
  usesPkce: false,
  reviewEnvFlag: "FACEBOOK_APPROVED",
  endpoints: {
    graph: GRAPH,
    accounts: `${GRAPH}/me/accounts`,
  },
  credentials: credentialsReader({
    clientId: ["FACEBOOK_APP_ID", "META_APP_ID"],
    clientSecret: ["FACEBOOK_APP_SECRET", "META_APP_SECRET"],
  }),
};
