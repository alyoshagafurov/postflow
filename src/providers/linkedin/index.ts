/** LinkedIn — scaffold. Real OAuth endpoints; publishing TODO. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.LINKEDIN_API_VERSION || "202405";

export const linkedinConfig: ProviderConfig = {
  id: "linkedin",
  label: "LinkedIn",
  color: "#0A66C2",
  apiVersion: API_VERSION,
  baseUrl: "https://api.linkedin.com/rest",
  authUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  scopes: ["openid", "profile", "w_member_social"],
  capabilities: defineCapabilities({ video: true, image: true, analytics: true }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "LINKEDIN_CLIENT_ID",
    clientSecret: "LINKEDIN_CLIENT_SECRET",
  }),
};

export const linkedinProvider = createScaffoldProvider(linkedinConfig);
