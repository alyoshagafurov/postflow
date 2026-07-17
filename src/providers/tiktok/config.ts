/** TikTok Content Posting API (v2). */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.TIKTOK_API_VERSION || "v2";

export const tiktokConfig: ProviderConfig = {
  id: "tiktok",
  label: "TikTok",
  color: "#25F4EE",
  apiVersion: API_VERSION,
  baseUrl: `https://open.tiktokapis.com/${API_VERSION}`,
  authUrl: "https://www.tiktok.com/v2/auth/authorize/",
  tokenUrl: `https://open.tiktokapis.com/${API_VERSION}/oauth/token/`,
  scopes: ["user.info.basic", "video.publish", "video.upload"],
  capabilities: defineCapabilities({ video: true }),
  usesPkce: false,
  reviewEnvFlag: "TIKTOK_APPROVED",
  endpoints: {
    userInfo: `https://open.tiktokapis.com/${API_VERSION}/user/info/`,
    creatorInfo: `https://open.tiktokapis.com/${API_VERSION}/post/publish/creator_info/query/`,
    initPublish: `https://open.tiktokapis.com/${API_VERSION}/post/publish/video/init/`,
    status: `https://open.tiktokapis.com/${API_VERSION}/post/publish/status/fetch/`,
  },
  credentials: credentialsReader({
    clientId: "TIKTOK_CLIENT_KEY",
    clientSecret: "TIKTOK_CLIENT_SECRET",
  }),
};
