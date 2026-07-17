import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  NetworkError,
  NotImplementedError,
  ProviderError,
} from "@/providers/core/errors";
import { nullLogger } from "@/providers/core/logger";
import { PublishingPipeline } from "@/providers/core/publishing";
import type { MediaResolver, PublishInput } from "@/providers/core/types";
import { createMockProvider } from "./mock-provider";

const media: MediaResolver = {
  publicUrl: (key) => `https://cdn.test/${key}`,
  localPath: async () => ({ path: "/tmp/x.mp4", cleanup: async () => {} }),
};

const input: PublishInput = {
  title: "Title",
  caption: "Caption",
  description: "Description",
  tags: ["a"],
  privacy: "public",
  media: { kind: "video", key: "videos/x.mp4", mime: "video/mp4" },
  publishNow: true,
};

const pipeline = (retries = 0) =>
  new PublishingPipeline({ media, logger: nullLogger, retries });

const target = { accountId: "acc-1" };

describe("PublishingPipeline", () => {
  it("publishes through the provider and returns a normalized result", async () => {
    const { provider, calls } = createMockProvider();
    const res = await pipeline().publish(provider, { accessToken: "at" }, input, target);

    expect(res.state).toBe("PUBLISHED");
    expect(res.platformPostId).toBe("post-1");
    expect(calls.publish).toBe(1);
  });

  it("retries a transient failure then succeeds", async () => {
    const { provider, calls } = createMockProvider({
      failTimes: 1,
      publishError: new NetworkError("blip"),
    });
    const res = await pipeline(2).publish(provider, { accessToken: "at" }, input, target);

    expect(res.state).toBe("PUBLISHED");
    expect(calls.publish).toBe(2);
  });

  it("does not retry a non-retryable failure", async () => {
    const { provider, calls } = createMockProvider({
      publishError: new AuthenticationError("bad token"),
    });
    await expect(
      pipeline(3).publish(provider, { accessToken: "at" }, input, target),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(calls.publish).toBe(1);
  });

  it("normalizes unknown provider throwables into ProviderError", async () => {
    const { provider } = createMockProvider({ publishError: new Error("weird sdk crash") });
    const err = await pipeline()
      .publish(provider, { accessToken: "at" }, input, target)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe("PUBLISHING");
    expect(err.provider).toBe("mock");
  });

  it("passes a media resolver and account context to the provider", async () => {
    const { provider } = createMockProvider();
    let seen: { accountId?: string; url?: string } = {};
    provider.publisher.publish = async (_t, i, ctx) => {
      seen = { accountId: ctx.accountId, url: ctx.media.publicUrl(i.media.key) };
      return { platformPostId: "p", state: "PUBLISHED" };
    };

    await pipeline().publish(provider, { accessToken: "at" }, input, {
      accountId: "acc-42",
      targetMeta: { userId: "ig-1" },
    });

    expect(seen.accountId).toBe("acc-42");
    expect(seen.url).toBe("https://cdn.test/videos/x.mp4");
  });

  it("reads status through the provider", async () => {
    const { provider } = createMockProvider();
    const st = await pipeline().getStatus(provider, { accessToken: "at" }, "post-1");
    expect(st.state).toBe("PUBLISHED");
  });

  it("reports NotImplemented when a provider cannot delete", async () => {
    const { provider } = createMockProvider();
    await expect(
      pipeline().remove(provider, { accessToken: "at" }, "post-1", target),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
