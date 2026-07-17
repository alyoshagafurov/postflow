/**
 * Instagram END-TO-END verification against the REAL Meta API. Nothing is mocked.
 *
 * It drives the actual provider code (`instagramAuth` / `instagramPublisher`),
 * so whatever passes here is what production runs. Every HTTP request and
 * response is printed via a global fetch interceptor (tokens/secrets masked).
 *
 * WHY THIS NEEDS A HUMAN: an OAuth authorization code can only be produced by a
 * real person logging into Instagram and granting consent in a browser. No
 * script can generate one. So this runs in two phases.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 *   INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET   (or META_APP_ID / META_APP_SECRET)
 *   INSTAGRAM_REDIRECT_URI   e.g. https://postflow.lol/api/connect/instagram/callback
 *   IG_TEST_VIDEO_URL        public MP4 URL (only needed for --publish)
 *
 * ── Phase 1: get the consent URL ───────────────────────────────────────────
 *   npx tsx scripts/instagram-e2e.ts
 *   → open the printed URL, approve, copy the `code` from the redirect
 *
 * ── Phase 2: run the flow ──────────────────────────────────────────────────
 *   npx tsx scripts/instagram-e2e.ts --code=AQB...
 *   npx tsx scripts/instagram-e2e.ts --code=AQB... --publish   # POSTS A REAL REEL
 *
 * `--publish` publishes PUBLICLY to the connected account and cannot be undone
 * via the API. It is opt-in for that reason.
 */
import "dotenv/config";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { instagramConfig as cfg } from "@/providers/instagram/config";
import { instagramAuth } from "@/providers/instagram/auth";
import { instagramPublisher } from "@/providers/instagram/publisher";
import { nullLogger } from "@/providers/core/logger";
import type { MediaResolver, TokenSet } from "@/providers/core/types";

// ---------------------------------------------------------------------------
// Log every request/response, with secrets masked.
// ---------------------------------------------------------------------------
function mask(s: string): string {
  return s
    .replace(/((?:access_token|client_secret|code)=)[^&\s"']+/gi, "$1«masked»")
    .replace(/("(?:access_token|client_secret)"\s*:\s*")[^"]*/gi, '$1«masked»');
}

const realFetch = globalThis.fetch;
let n = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? "GET";
  console.log(`\n──────── HTTP #${++n} ────────`);
  console.log(`→ ${method} ${mask(url)}`);
  if (init?.body) console.log(`→ body   ${mask(String(init.body))}`);
  const started = Date.now();
  const res = await realFetch(input as RequestInfo, init);
  const body = await res.clone().text();
  console.log(`← ${res.status} ${res.statusText}  (${Date.now() - started}ms)`);
  console.log(`← ${mask(body).slice(0, 2000)}`);
  return res;
}) as typeof fetch;

// ---------------------------------------------------------------------------
const arg = (k: string) =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const flag = (k: string) => process.argv.includes(`--${k}`);

const REDIRECT =
  process.env.INSTAGRAM_REDIRECT_URI ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/connect/instagram/callback`;

function heading(t: string) {
  console.log(`\n\n════════════════════════════════════════\n${t}\n════════════════════════════════════════`);
}

async function main() {
  heading("CONFIG");
  const creds = cfg.credentials();
  console.table({
    apiVersion: cfg.apiVersion,
    authUrl: cfg.authUrl,
    tokenUrl: cfg.tokenUrl,
    graphBaseUrl: cfg.baseUrl,
    longLivedToken: cfg.endpoints?.longLivedToken,
    refreshToken: cfg.endpoints?.refreshToken,
    scopes: cfg.scopes.join(","),
    redirectUri: REDIRECT,
    clientId: creds.clientId ? `${creds.clientId.slice(0, 6)}…` : "MISSING",
    clientSecret: creds.clientSecret ? "present" : "MISSING",
  });

  if (!creds.clientId || !creds.clientSecret) {
    console.error(
      "\n✗ BLOCKED: no Instagram app credentials.\n" +
        "  Set INSTAGRAM_APP_ID + INSTAGRAM_APP_SECRET (or META_APP_ID/META_APP_SECRET).\n" +
        "  Get them from: Meta app → Products → Instagram → API setup with Instagram login.",
    );
    process.exit(1);
  }

  const code = arg("code");
  if (!code) {
    heading("STEP 1 — AUTHORIZATION URL (human consent required)");
    const url = instagramAuth.getAuthorizationUrl({
      redirectUri: REDIRECT,
      state: "e2e-" + Date.now(),
    });
    console.log("\nOpen this URL, approve, then copy the `code` query param:\n");
    console.log(url);
    console.log("\nThen re-run:\n  npx tsx scripts/instagram-e2e.ts --code=<code>\n");
    return;
  }

  // 2 — exchange code → short-lived → long-lived, and fetch profile
  heading("STEP 2 — EXCHANGE CODE → TOKENS  +  STEP 5 — FETCH PROFILE");
  const { tokens, profile } = await instagramAuth.exchangeCode({
    code,
    redirectUri: REDIRECT,
  });
  console.log("\nTokens:", {
    accessToken: `${tokens.accessToken.slice(0, 8)}…(${tokens.accessToken.length} chars)`,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt?.toISOString() ?? null,
    scope: tokens.scope,
    meta: tokens.meta,
  });
  console.log("Profile:", profile);

  // 3 — storage (the real AES-256-GCM path used by the DB)
  heading("STEP 3 — STORE TOKENS (AES-256-GCM, as persisted)");
  const enc = encryptToken(tokens.accessToken);
  const dec = decryptToken(enc);
  console.log("ciphertext:", `${enc.slice(0, 32)}…`);
  console.log("round-trip matches original:", dec === tokens.accessToken);
  if (dec !== tokens.accessToken) throw new Error("token storage round-trip FAILED");

  // 4 — refresh
  heading("STEP 4 — REFRESH TOKEN");
  let live: TokenSet = tokens;
  try {
    live = await instagramAuth.refreshToken(tokens);
    console.log("\nRefreshed:", {
      accessToken: `${live.accessToken.slice(0, 8)}…`,
      expiresAt: live.expiresAt?.toISOString() ?? null,
    });
  } catch (e) {
    // Meta rejects refresh for tokens younger than 24h — expected on a fresh connect.
    console.log("\n⚠ refresh rejected (expected for a <24h-old token):", (e as Error).message);
  }

  console.log("\nvalidateToken →", await instagramAuth.validateToken(live));
  console.log("fetchCapabilities →", await instagramAuth.fetchCapabilities(live, profile));

  if (!flag("publish")) {
    heading("DONE (auth verified). Re-run with --publish to post a real Reel.");
    return;
  }

  // 6/7/8 — upload + publish + status
  const videoUrl = process.env.IG_TEST_VIDEO_URL;
  if (!videoUrl) {
    console.error("\n✗ IG_TEST_VIDEO_URL is required for --publish (public MP4 URL).");
    process.exit(1);
  }
  const media: MediaResolver = {
    publicUrl: () => videoUrl,
    localPath: async () => {
      throw new Error("not needed — Instagram fetches by URL");
    },
  };

  heading("STEP 6/7 — UPLOAD REEL CONTAINER → PUBLISH");
  const result = await instagramPublisher.publish(
    live,
    {
      title: "PostFlow E2E",
      caption: `PostFlow E2E ${new Date().toISOString()}`,
      description: "",
      tags: [],
      privacy: "public",
      media: { kind: "video", key: "e2e", mime: "video/mp4" },
      publishNow: true,
    },
    { accountId: profile.id, targetMeta: tokens.meta, media, logger: nullLogger },
  );
  console.log("\nPublish result:", result);

  heading("STEP 8 — READ STATUS");
  console.log(await instagramPublisher.getStatus(live, result.platformPostId));

  heading("STEP 9 — FINAL PUBLISHED URL");
  console.log(result.platformUrl ?? "(no permalink returned)");
}

main().catch((e) => {
  console.error("\n✗ FAILED:", e);
  process.exit(1);
});
