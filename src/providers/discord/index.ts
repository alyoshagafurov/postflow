/** Discord — scaffold. Real OAuth2 endpoints; publishing (webhook) TODO. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.DISCORD_API_VERSION || "v10";

export const discordConfig: ProviderConfig = {
  id: "discord",
  label: "Discord",
  color: "#5865F2",
  apiVersion: API_VERSION,
  baseUrl: `https://discord.com/api/${API_VERSION}`,
  authUrl: "https://discord.com/oauth2/authorize",
  tokenUrl: "https://discord.com/api/oauth2/token",
  scopes: ["identify", "webhook.incoming"],
  capabilities: defineCapabilities({ video: true, image: true, webhooks: true }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "DISCORD_CLIENT_ID",
    clientSecret: "DISCORD_CLIENT_SECRET",
  }),
};

export const discordProvider = createScaffoldProvider(discordConfig);
