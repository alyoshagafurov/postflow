import type { Platform } from "@prisma/client";
import type { Publisher } from "./types";
import { youtubePublisher } from "./youtube";
import { tiktokPublisher } from "./tiktok";
import { instagramPublisher } from "./instagram";

const REGISTRY: Partial<Record<Platform, Publisher>> = {
  YOUTUBE: youtubePublisher,
  TIKTOK: tiktokPublisher,
  INSTAGRAM: instagramPublisher,
};

export function getPublisher(platform: Platform): Publisher | null {
  return REGISTRY[platform] ?? null;
}

export * from "./types";
