/**
 * Provider registration barrel.
 *
 * Importing this module registers every provider into the registry. The rest of
 * the app imports from here (or `@/providers/core`) and never touches a concrete
 * provider directly. Adding a provider = add its folder + one line below.
 */
import { registerProvider } from "./core/registry";
import type { SocialProvider } from "./core/types";

import { instagramProvider } from "./instagram";
import { youtubeProvider } from "./youtube";
import { tiktokProvider } from "./tiktok";
import { facebookProvider } from "./facebook";
import { threadsProvider } from "./threads";
import { linkedinProvider } from "./linkedin";
import { twitterProvider } from "./twitter";
import { discordProvider } from "./discord";
import { pinterestProvider } from "./pinterest";
import { telegramProvider } from "./telegram";

const ALL: SocialProvider[] = [
  // Real implementations
  instagramProvider,
  youtubeProvider,
  tiktokProvider,
  facebookProvider,
  // Scaffolds (interface-conformant; finish the folder to go live)
  threadsProvider,
  linkedinProvider,
  twitterProvider,
  discordProvider,
  pinterestProvider,
  telegramProvider,
];

let registered = false;
export function registerAllProviders(): void {
  if (registered) return;
  registered = true;
  for (const p of ALL) registerProvider(p);
}

// Register on first import (idempotent within a process).
registerAllProviders();

export * from "./core";
export {
  instagramProvider,
  youtubeProvider,
  tiktokProvider,
  facebookProvider,
};
