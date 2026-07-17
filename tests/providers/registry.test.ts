import { afterEach, describe, expect, it } from "vitest";
import {
  __resetRegistry,
  getProvider,
  isProviderEnabled,
  listConfiguredProviders,
  listProviders,
  registerProvider,
  requireProvider,
} from "@/providers/core/registry";
import { createMockProvider } from "./mock-provider";

afterEach(() => __resetRegistry());

describe("provider registry", () => {
  it("registers and resolves a provider by id", () => {
    const { provider } = createMockProvider();
    registerProvider(provider);
    expect(getProvider("mock")).toBe(provider);
    expect(requireProvider("mock")).toBe(provider);
    expect(listProviders()).toHaveLength(1);
  });

  it("returns null for an unknown provider", () => {
    expect(getProvider("nope")).toBeNull();
    expect(() => requireProvider("nope")).toThrow(/Unknown provider/);
  });

  it("rejects duplicate registration", () => {
    const { provider } = createMockProvider();
    registerProvider(provider);
    expect(() => registerProvider(provider)).toThrow(/already registered/);
  });

  it("lists only configured providers", () => {
    const { provider } = createMockProvider();
    registerProvider(provider);
    registerProvider({ ...provider, id: "unconfigured", isConfigured: () => false });

    expect(listProviders()).toHaveLength(2);
    expect(listConfiguredProviders().map((p) => p.id)).toEqual(["mock"]);
    expect(isProviderEnabled("mock")).toBe(true);
    expect(isProviderEnabled("unconfigured")).toBe(false);
    expect(isProviderEnabled("missing")).toBe(false);
  });
});

describe("real provider registration", () => {
  it("registers every shipped provider exactly once", async () => {
    __resetRegistry();
    const { registerAllProviders } = await import("@/providers/index");
    registerAllProviders();
    const ids = listProviders().map((p) => p.id);
    for (const expected of ["instagram", "youtube", "tiktok", "facebook"]) {
      expect(ids).toContain(expected);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
