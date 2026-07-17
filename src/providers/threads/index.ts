/** Threads (Meta) — scaffold. Real OAuth endpoints; publishing TODO. */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

const API_VERSION = process.env.THREADS_API_VERSION || "v1.0";

export const threadsConfig: ProviderConfig = {
  id: "threads",
  label: "Threads",
  color: "#000000",
  apiVersion: API_VERSION,
  baseUrl: `https://graph.threads.net/${API_VERSION}`,
  authUrl: "https://threads.net/oauth/authorize",
  tokenUrl: "https://graph.threads.net/oauth/access_token",
  scopes: ["threads_basic", "threads_content_publish"],
  capabilities: defineCapabilities({ video: true, image: true, threads: true, comments: true }),
  usesPkce: false,
  reviewEnvFlag: "THREADS_APPROVED",
  credentials: credentialsReader({
    clientId: ["THREADS_APP_ID", "META_APP_ID"],
    clientSecret: ["THREADS_APP_SECRET", "META_APP_SECRET"],
  }),
};

export const threadsProvider = createScaffoldProvider(threadsConfig, { scopeSeparator: "," });
