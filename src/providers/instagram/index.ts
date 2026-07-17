import { isConfigured, requiresReview } from "../core/config";
import type { SocialProvider } from "../core/types";
import { instagramConfig } from "./config";
import { instagramAuth } from "./auth";
import { instagramPublisher } from "./publisher";

export const instagramProvider: SocialProvider = {
  id: instagramConfig.id,
  config: instagramConfig,
  auth: instagramAuth,
  publisher: instagramPublisher,
  isConfigured: () => isConfigured(instagramConfig),
  requiresReview: () => requiresReview(instagramConfig),
  capabilities: () => instagramConfig.capabilities,
};
