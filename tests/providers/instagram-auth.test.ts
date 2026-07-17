/**
 * Regression guard for the "Invalid Scopes" bug.
 *
 * The old implementation sent users to facebook.com/dialog/oauth with
 * deprecated scopes. These tests fail loudly if anyone reintroduces either.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { instagramAuth } from "@/providers/instagram/auth";
import { instagramConfig } from "@/providers/instagram/config";

const DEPRECATED_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",
  "manage_pages",
  "publish_to_groups",
  "business_management",
];

const REDIRECT = "https://postflow.lol/api/connect/instagram/callback";

function authUrl(): URL {
  return new URL(
    instagramAuth.getAuthorizationUrl({ redirectUri: REDIRECT, state: "state-123" }),
  );
}

describe("Instagram — Instagram Login authorization", () => {
  beforeAll(() => {
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_APP_SECRET = "test-app-secret";
  });

  it("authorizes on instagram.com, never the Facebook dialog", () => {
    const url = authUrl();
    expect(url.origin + url.pathname).toBe("https://www.instagram.com/oauth/authorize");
    expect(url.toString()).not.toContain("facebook.com");
    expect(url.toString()).not.toContain("dialog/oauth");
  });

  it("requests only current instagram_business_* scopes", () => {
    const scope = authUrl().searchParams.get("scope") ?? "";
    const scopes = scope.split(",").filter(Boolean);

    expect(scopes).toContain("instagram_business_basic");
    expect(scopes).toContain("instagram_business_content_publish");
    // Every requested scope must belong to the current namespace.
    for (const s of scopes) expect(s.startsWith("instagram_business_")).toBe(true);
    // And none of the removed ones may appear.
    for (const dead of DEPRECATED_SCOPES) expect(scopes).not.toContain(dead);
    // Least privilege: exactly the two scopes PostFlow actually exercises.
    expect(scopes).toEqual([
      "instagram_business_basic",
      "instagram_business_content_publish",
    ]);
    expect(scopes).not.toContain("instagram_business_manage_comments");
    expect(scopes).not.toContain("instagram_business_manage_messages");
  });

  it("uses the latest documented Graph API version (v25.0)", () => {
    expect(instagramConfig.apiVersion).toBe("v25.0");
    expect(instagramConfig.baseUrl).toBe("https://graph.instagram.com/v25.0");
  });

  it("marks Instagram tokens as self-refreshing (no refresh_token)", () => {
    expect(instagramConfig.selfRefreshing).toBe(true);
  });

  it("sends the standard OAuth params", () => {
    const p = authUrl().searchParams;
    expect(p.get("client_id")).toBe("test-app-id");
    expect(p.get("response_type")).toBe("code");
    expect(p.get("redirect_uri")).toBe(REDIRECT);
    expect(p.get("state")).toBe("state-123");
  });

  it("points token/graph traffic at the Instagram hosts", () => {
    expect(instagramConfig.tokenUrl).toBe("https://api.instagram.com/oauth/access_token");
    expect(instagramConfig.baseUrl.startsWith("https://graph.instagram.com/")).toBe(true);
    expect(instagramConfig.baseUrl).not.toContain("graph.facebook.com");
    expect(instagramConfig.endpoints?.refreshToken).toBe(
      "https://graph.instagram.com/refresh_access_token",
    );
  });

  it("declares publishing capabilities and review gating", () => {
    expect(instagramConfig.capabilities.reels).toBe(true);
    expect(instagramConfig.capabilities.video).toBe(true);
    expect(instagramConfig.reviewEnvFlag).toBe("INSTAGRAM_APPROVED");
  });

  it("disables publishing capabilities for personal accounts", async () => {
    const caps = await instagramAuth.fetchCapabilities(
      { accessToken: "x" },
      { id: "1", accountType: "personal" },
    );
    expect(caps.video).toBe(false);
    expect(caps.reels).toBe(false);
  });

  it("keeps full capabilities for business accounts", async () => {
    const caps = await instagramAuth.fetchCapabilities(
      { accessToken: "x" },
      { id: "1", accountType: "business" },
    );
    expect(caps.reels).toBe(true);
  });
});
