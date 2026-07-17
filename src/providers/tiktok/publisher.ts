/** TikTok Direct Post: creator_info → init (FILE_UPLOAD) → chunked PUT → poll. */
import { promises as fs } from "node:fs";
import { MediaError, PublishingError } from "../core/errors";
import { apiFetch } from "../core/http";
import type {
  Publisher,
  PublishContext,
  PublishInput,
  PublishResult,
  PublishStatusResult,
  TokenSet,
} from "../core/types";
import { tiktokConfig as cfg } from "./config";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

function tiktokError(body: unknown): string | null {
  const b = body as { error?: { code?: string; message?: string } };
  if (b?.error && b.error.code && b.error.code !== "ok") {
    return b.error.message || b.error.code;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiPost<T = any>(url: string, token: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    provider: cfg.id,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
    detectError: tiktokError,
  });
}

async function pollStatus(token: string, publishId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const data = await apiPost<{ data?: { status?: string } }>(
      cfg.endpoints!.status,
      token,
      { publish_id: publishId },
    );
    const s = data.data?.status;
    if (s === "PUBLISH_COMPLETE" || s === "FAILED") return s;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return "PROCESSING";
}

export const tiktokPublisher: Publisher = {
  async publish(
    tokens: TokenSet,
    input: PublishInput,
    ctx: PublishContext,
  ): Promise<PublishResult> {
    // creator_info/query is required by TikTok before every publish.
    await apiPost(cfg.endpoints!.creatorInfo, tokens.accessToken, {});

    const { path, cleanup } = await ctx.media.localPath(input.media.key);
    try {
      const stat = await fs.stat(path);
      const size = stat.size;
      const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));
      const chunkSize = totalChunks === 1 ? size : CHUNK_SIZE;

      const init = await apiPost<{ data?: { publish_id?: string; upload_url?: string } }>(
        cfg.endpoints!.initPublish,
        tokens.accessToken,
        {
          post_info: {
            title: input.caption || input.title,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: size,
            chunk_size: chunkSize,
            total_chunk_count: totalChunks,
          },
        },
      );
      const publishId = init.data?.publish_id;
      const uploadUrl = init.data?.upload_url;
      if (!publishId || !uploadUrl) {
        throw new MediaError("TikTok: upload not initialised", { provider: cfg.id });
      }

      const fh = await fs.open(path, "r");
      try {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, size) - 1;
          const len = end - start + 1;
          const buf = Buffer.alloc(len);
          await fh.read(buf, 0, len, start);
          const up = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": input.media.mime ?? "video/mp4",
              "Content-Length": String(len),
              "Content-Range": `bytes ${start}-${end}/${size}`,
            },
            body: buf,
          });
          if (!up.ok && up.status !== 201 && up.status !== 206) {
            throw new MediaError(`TikTok upload chunk ${i} failed: ${up.status}`, {
              provider: cfg.id,
            });
          }
        }
      } finally {
        await fh.close();
      }

      const status = await pollStatus(tokens.accessToken, publishId);
      return {
        platformPostId: publishId,
        platformUrl: null,
        state: status === "PUBLISH_COMPLETE" ? "PUBLISHED" : "PROCESSING",
      };
    } catch (e) {
      if (e instanceof MediaError || e instanceof PublishingError) throw e;
      throw new PublishingError(e instanceof Error ? e.message : "TikTok publish failed", {
        provider: cfg.id,
        cause: e,
      });
    } finally {
      await cleanup();
    }
  },

  async getStatus(
    tokens: TokenSet,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    const data = await apiPost<{ data?: { status?: string; fail_reason?: string } }>(
      cfg.endpoints!.status,
      tokens.accessToken,
      { publish_id: platformPostId },
    );
    const s = data.data?.status;
    if (s === "PUBLISH_COMPLETE") return { state: "PUBLISHED" };
    if (s === "FAILED") return { state: "FAILED", error: data.data?.fail_reason || "failed" };
    return { state: "PROCESSING" };
  },
};
