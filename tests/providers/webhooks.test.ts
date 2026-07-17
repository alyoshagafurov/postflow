import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  computeHmac,
  safeEqual,
  verifyHmacSignature,
} from "@/providers/core/webhooks";

const SECRET = "app-secret";
const BODY = JSON.stringify({ object: "instagram", entry: [{ id: "1" }] });

function sign(body: string, secret = SECRET, algo: "sha1" | "sha256" = "sha256") {
  return crypto.createHmac(algo, secret).update(body, "utf8").digest("hex");
}

describe("webhook signature verification", () => {
  it("accepts a valid signature", () => {
    expect(verifyHmacSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("accepts a valid signature with the sha256= prefix (Meta style)", () => {
    expect(verifyHmacSignature(BODY, `sha256=${sign(BODY)}`, SECRET)).toBe(true);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyHmacSignature(BODY, sign(BODY, "attacker"), SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = sign(BODY);
    expect(verifyHmacSignature(BODY + " ", sig, SECRET)).toBe(false);
  });

  it("rejects empty signature or secret", () => {
    expect(verifyHmacSignature(BODY, "", SECRET)).toBe(false);
    expect(verifyHmacSignature(BODY, sign(BODY), "")).toBe(false);
  });

  it("supports sha1 signatures", () => {
    const sig = `sha1=${sign(BODY, SECRET, "sha1")}`;
    expect(verifyHmacSignature(BODY, sig, SECRET, { algorithm: "sha1" })).toBe(true);
  });

  it("computes a stable hmac", () => {
    expect(computeHmac(BODY, SECRET)).toBe(sign(BODY));
  });

  it("compares in constant time without throwing on length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});
