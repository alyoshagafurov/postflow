import { isConfigured, requiresReview } from "../core/config";
import type { SocialProvider } from "../core/types";
import { youtubeConfig } from "./config";
import { youtubeAuth } from "./auth";
import { youtubePublisher } from "./publisher";

export const youtubeProvider: SocialProvider = {
  id: youtubeConfig.id,
  config: youtubeConfig,
  auth: youtubeAuth,
  publisher: youtubePublisher,
  isConfigured: () => isConfigured(youtubeConfig),
  requiresReview: () => requiresReview(youtubeConfig),
  capabilities: () => youtubeConfig.capabilities,
};
