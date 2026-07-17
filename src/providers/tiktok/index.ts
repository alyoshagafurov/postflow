import { isConfigured, requiresReview } from "../core/config";
import type { SocialProvider } from "../core/types";
import { tiktokConfig } from "./config";
import { tiktokAuth } from "./auth";
import { tiktokPublisher } from "./publisher";

export const tiktokProvider: SocialProvider = {
  id: tiktokConfig.id,
  config: tiktokConfig,
  auth: tiktokAuth,
  publisher: tiktokPublisher,
  isConfigured: () => isConfigured(tiktokConfig),
  requiresReview: () => requiresReview(tiktokConfig),
  capabilities: () => tiktokConfig.capabilities,
};
