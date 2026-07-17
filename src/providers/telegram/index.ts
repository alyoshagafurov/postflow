/**
 * Telegram — scaffold.
 *
 * NOTE: Telegram does NOT use OAuth2. Publishing is via the Bot API
 * (`https://api.telegram.org/bot<token>/sendVideo`) with a bot token + chat id.
 * This scaffold reserves the folder and declares capabilities; a real
 * implementation would supply a bot-token-based AuthProvider instead of the
 * OAuth2 scaffold. Left as NotImplemented on purpose — no fake OAuth.
 */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

export const telegramConfig: ProviderConfig = {
  id: "telegram",
  label: "Telegram",
  color: "#26A5E4",
  apiVersion: "bot",
  baseUrl: "https://api.telegram.org",
  authUrl: "https://oauth.telegram.org/auth",
  tokenUrl: "https://api.telegram.org",
  scopes: [],
  capabilities: defineCapabilities({ video: true, image: true, comments: false }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "TELEGRAM_BOT_TOKEN",
    clientSecret: "TELEGRAM_BOT_TOKEN",
  }),
};

export const telegramProvider = createScaffoldProvider(telegramConfig);
