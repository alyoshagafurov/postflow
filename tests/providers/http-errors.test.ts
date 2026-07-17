import { describe, expect, it } from "vitest";
import { jsonErrorMessage } from "@/providers/core/http";

describe("jsonErrorMessage — single source of API error extraction", () => {
  it("reads the Graph error.message shape", () => {
    expect(jsonErrorMessage({ error: { message: "bad token" } })).toBe("bad token");
  });

  it("reads the Graph error.error_message shape", () => {
    expect(jsonErrorMessage({ error: { error_message: "nested" } })).toBe("nested");
  });

  it("reads the Instagram Login OAuth error_message shape (regression)", () => {
    // The short-lived token exchange returns THIS shape; it used to be lost,
    // surfacing only a bare "HTTP 400".
    expect(
      jsonErrorMessage({
        error_type: "OAuthException",
        code: 400,
        error_message: "Invalid platform app",
      }),
    ).toBe("Invalid platform app");
  });

  it("reads the standard OAuth2 error_description", () => {
    expect(
      jsonErrorMessage({ error: "invalid_grant", error_description: "code expired" }),
    ).toBe("code expired");
  });

  it("falls back to a string error, then message", () => {
    expect(jsonErrorMessage({ error: "nope" })).toBe("nope");
    expect(jsonErrorMessage({ message: "hi" })).toBe("hi");
  });

  it("returns null for non-error bodies", () => {
    expect(jsonErrorMessage({})).toBeNull();
    expect(jsonErrorMessage(null)).toBeNull();
    expect(jsonErrorMessage("string")).toBeNull();
    expect(jsonErrorMessage({ data: { id: "1" } })).toBeNull();
  });
});
