/**
 * Provider capability model.
 *
 * Each provider declares what it supports; the UI reads this to enable/disable
 * features instead of hardcoding per-platform limitations anywhere in the app.
 */

export type Capability =
  | "video"
  | "image"
  | "carousel"
  | "stories"
  | "reels"
  | "shorts"
  | "threads"
  | "livestream"
  | "comments"
  | "analytics"
  | "dm"
  | "webhooks"
  | "drafts"
  | "scheduling";

export const ALL_CAPABILITIES: Capability[] = [
  "video",
  "image",
  "carousel",
  "stories",
  "reels",
  "shorts",
  "threads",
  "livestream",
  "comments",
  "analytics",
  "dm",
  "webhooks",
  "drafts",
  "scheduling",
];

export type CapabilityMap = Partial<Record<Capability, boolean>>;

export function hasCapability(map: CapabilityMap, cap: Capability): boolean {
  return map[cap] === true;
}

export function enabledCapabilities(map: CapabilityMap): Capability[] {
  return ALL_CAPABILITIES.filter((c) => map[c] === true);
}

/** Merge declared capabilities over the "everything false" baseline. */
export function defineCapabilities(map: CapabilityMap): CapabilityMap {
  const base: CapabilityMap = {};
  for (const c of ALL_CAPABILITIES) base[c] = false;
  return { ...base, ...map };
}
