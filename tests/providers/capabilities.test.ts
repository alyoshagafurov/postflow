import { describe, expect, it } from "vitest";
import {
  ALL_CAPABILITIES,
  defineCapabilities,
  enabledCapabilities,
  hasCapability,
} from "@/providers/core/capabilities";
import { createPkcePair, missingScopes } from "@/providers/core/oauth";

describe("capabilities", () => {
  it("defaults every capability to false and applies overrides", () => {
    const caps = defineCapabilities({ video: true, reels: true });
    expect(caps.video).toBe(true);
    expect(caps.reels).toBe(true);
    expect(caps.livestream).toBe(false);
    expect(Object.keys(caps).sort()).toEqual([...ALL_CAPABILITIES].sort());
  });

  it("reports enabled capabilities only", () => {
    const caps = defineCapabilities({ video: true, analytics: true });
    expect(enabledCapabilities(caps)).toEqual(["video", "analytics"]);
    expect(hasCapability(caps, "video")).toBe(true);
    expect(hasCapability(caps, "stories")).toBe(false);
    expect(hasCapability({}, "video")).toBe(false);
  });
});

describe("oauth helpers", () => {
  it("creates a valid RFC 7636 S256 PKCE pair", () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.method).toBe("S256");
    expect(a.verifier).not.toBe(a.challenge);
    expect(a.verifier).not.toBe(b.verifier); // random per call
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
    expect(a.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("detects missing scopes across separators", () => {
    expect(missingScopes(["read", "write"], "read write")).toEqual([]);
    expect(missingScopes(["read", "write"], "read,write")).toEqual([]);
    expect(missingScopes(["read", "write"], "read")).toEqual(["write"]);
    expect(missingScopes(["read"], null)).toEqual(["read"]);
  });
});
