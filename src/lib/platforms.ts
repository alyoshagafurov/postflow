import { Platform } from "@prisma/client";

export type PlatformMeta = {
  label: string;
  color: string;
  /** Tailwind classes for a subtle branded chip */
  chipClass: string;
};

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  YOUTUBE: {
    label: "YouTube",
    color: "#FF0033",
    chipClass: "bg-[#FF0033]/12 text-[#FF6B7D]",
  },
  TIKTOK: {
    label: "TikTok",
    color: "#25F4EE",
    chipClass: "bg-white/10 text-white",
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "#E1306C",
    chipClass: "bg-[#E1306C]/12 text-[#FF6FA5]",
  },
};

export const ALL_PLATFORMS: Platform[] = ["TIKTOK", "YOUTUBE", "INSTAGRAM"];

export function platformLabel(p: Platform): string {
  return PLATFORM_META[p].label;
}
