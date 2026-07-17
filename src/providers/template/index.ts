/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PROVIDER TEMPLATE — copy this folder to add a new social network.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Steps to add a provider (no other file needs structural changes):
 *
 *  1. Copy `src/providers/template/` → `src/providers/<name>/`.
 *  2. Fill in the config below (API_VERSION, endpoints, scopes, capabilities).
 *  3. Implement `auth` (OAuth) and `publisher` (publish/getStatus), OR keep the
 *     scaffold and finish it later.
 *  4. Register it in `src/providers/index.ts` (one line).
 *  5. If it maps to a NEW DB platform, add the enum value + a mapping entry in
 *     `src/providers/adapters/platform-map.ts` (documented there).
 *
 *  This template is intentionally NOT registered.
 */
import { defineCapabilities } from "../core/capabilities";
import { credentialsReader } from "../core/config";
import { createScaffoldProvider } from "../core/scaffold";
import type { ProviderConfig } from "../core/types";

export const templateConfig: ProviderConfig = {
  id: "template",
  label: "Template",
  color: "#888888",
  apiVersion: process.env.TEMPLATE_API_VERSION || "v1",
  baseUrl: "https://api.example.com/v1",
  authUrl: "https://example.com/oauth/authorize",
  tokenUrl: "https://api.example.com/v1/oauth/token",
  scopes: ["read", "write"],
  capabilities: defineCapabilities({ video: true, image: true }),
  usesPkce: false,
  credentials: credentialsReader({
    clientId: "TEMPLATE_CLIENT_ID",
    clientSecret: "TEMPLATE_CLIENT_SECRET",
  }),
};

// Replace `createScaffoldProvider` with a real `{ auth, publisher }` when ready.
export const templateProvider = createScaffoldProvider(templateConfig);
