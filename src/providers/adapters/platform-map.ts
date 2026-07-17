/**
 * The ONLY place the provider framework meets the DB `Platform` enum.
 *
 * The framework is string-keyed (ProviderId), so it needs no schema changes.
 * When you promote a scaffold to a real, connectable platform:
 *   1. add the value to the Prisma `Platform` enum + `prisma db push`
 *   2. add the two mapping entries below
 * That is the single, documented schema touch-point for a new platform.
 */
import { Platform } from "@prisma/client";
import type { ProviderId } from "../core/types";

const ENUM_TO_ID: Record<Platform, ProviderId> = {
  YOUTUBE: "youtube",
  TIKTOK: "tiktok",
  INSTAGRAM: "instagram",
};

const ID_TO_ENUM: Partial<Record<ProviderId, Platform>> = {
  youtube: Platform.YOUTUBE,
  tiktok: Platform.TIKTOK,
  instagram: Platform.INSTAGRAM,
};

export function providerIdForPlatform(platform: Platform): ProviderId {
  return ENUM_TO_ID[platform];
}

export function platformForProviderId(id: ProviderId): Platform | null {
  return ID_TO_ENUM[id] ?? null;
}

/** Whether a provider can currently be persisted (has a DB platform value). */
export function isPersistablePlatform(id: ProviderId): boolean {
  return id in ID_TO_ENUM;
}
