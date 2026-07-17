/** YouTube video upload via Data API v3 (resumable, streamed from storage). */
import { createReadStream } from "node:fs";
import type { youtube_v3 } from "@googleapis/youtube";
import { PublishingError } from "../core/errors";
import type {
  Publisher,
  PublishContext,
  PublishInput,
  PublishResult,
  PublishStatusResult,
  TokenSet,
} from "../core/types";
import { youtubeConfig as cfg } from "./config";
import { clientWithTokens, ytApi } from "./client";

export const youtubePublisher: Publisher = {
  async publish(
    tokens: TokenSet,
    input: PublishInput,
    ctx: PublishContext,
  ): Promise<PublishResult> {
    const yt = ytApi(clientWithTokens(tokens));

    const status: youtube_v3.Schema$VideoStatus = {
      selfDeclaredMadeForKids: false,
    };
    if (!input.publishNow && input.scheduledAt) {
      status.privacyStatus = "private";
      status.publishAt = input.scheduledAt.toISOString();
    } else {
      status.privacyStatus = input.privacy;
    }

    const { path, cleanup } = await ctx.media.localPath(input.media.key);
    try {
      const res = await yt.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: input.title || "Video",
            description: input.description,
            tags: input.tags,
          },
          status,
        },
        media: {
          mimeType: input.media.mime ?? "video/*",
          body: createReadStream(path),
        },
      });

      const id = res.data.id;
      if (!id) throw new PublishingError("YouTube returned no video id", { provider: cfg.id });
      const uploadStatus = res.data.status?.uploadStatus;
      if (uploadStatus === "failed" || uploadStatus === "rejected") {
        throw new PublishingError(
          `YouTube rejected the video: ${res.data.status?.rejectionReason ?? uploadStatus}`,
          { provider: cfg.id },
        );
      }
      return {
        platformPostId: id,
        platformUrl: `https://youtu.be/${id}`,
        state: input.publishNow ? "PUBLISHED" : "SCHEDULED",
      };
    } finally {
      await cleanup();
    }
  },

  async getStatus(
    tokens: TokenSet,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    const yt = ytApi(clientWithTokens(tokens));
    const res = await yt.videos.list({
      part: ["status", "processingDetails"],
      id: [platformPostId],
    });
    const item = res.data.items?.[0];
    const uploadStatus = item?.status?.uploadStatus;
    const url = `https://youtu.be/${platformPostId}`;
    if (uploadStatus === "processed") return { state: "PUBLISHED", platformUrl: url };
    if (uploadStatus === "failed" || uploadStatus === "rejected") {
      return {
        state: "FAILED",
        error: item?.status?.failureReason ?? item?.status?.rejectionReason ?? "rejected",
      };
    }
    return { state: "PROCESSING", platformUrl: url };
  },

  async delete(tokens: TokenSet, platformPostId: string): Promise<void> {
    const yt = ytApi(clientWithTokens(tokens));
    await yt.videos.delete({ id: platformPostId });
  },
};
