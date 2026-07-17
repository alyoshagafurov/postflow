/** Pinterest — scaffold. Real OAuth2 endpoints; publishing TODO. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.PINTEREST_API_VERSION || "v5";

export const pinterestConfig: ProviderConfig = {
  id: "pinterest",
  label: "Pinterest",
  color: "#E60023",
  apiVersion: API_VERSION,
  baseUrl: `https://api.pinterest.com/${API_VERSION}`,
  authUrl: "https://www.pinterest.com/oauth/",
  tokenUrl: "https://api.pinterest.com/v5/oauth/token",
  scopes: ["boards:read", "pins:read", "pins:write"],
  capabilities: defineCapabilities({ video: true, image: true }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "PINTEREST_APP_ID",
    clientSecret: "PINTEREST_APP_SECRET",
  }),
};

export const pinterestProvider = createScaffoldProvider(pinterestConfig);
