/**
 * Instagram publishing via the Content Publishing API (Instagram Login).
 * Flow: create media container → poll processing → publish → read permalink.
 * Instagram fetches the media from a public URL, so we hand it our storage URL.
 */
import { MediaError, PublishingError } from "../core/errors";
import { apiFetch, jsonErrorMessage as graphError } from "../core/http";
import type {
  Publisher,
  PublishContext,
  PublishInput,
  PublishResult,
  PublishStatusResult,
  TokenSet,
} from "../core/types";
import { instagramConfig as cfg } from "./config";

function igUserId(ctx: PublishContext): string {
  return (
    (ctx.targetMeta?.userId as string) ??
    (ctx.targetMeta?.igUserId as string) ??
    ctx.accountId
  );
}

async function createContainer(
  id: string,
  input: PublishInput,
  mediaUrl: string,
  token: string,
): Promise<string> {
  const isVideo = input.media.kind === "video";
  const body: Record<string, string> = {
    caption: input.caption,
    access_token: token,
  };
  if (isVideo) {
    body.media_type = "REELS";
    body.video_url = mediaUrl;
  } else {
    body.image_url = mediaUrl;
  }
  const res = await apiFetch<{ id?: string }>(`${cfg.baseUrl}/${id}/media`, {
    provider: cfg.id,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    detectError: graphError,
  });
  if (!res.id) throw new MediaError("Instagram: container not created", { provider: cfg.id });
  return res.id;
}

async function waitFinished(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const url = new URL(`${cfg.baseUrl}/${containerId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", token);
    const st = await apiFetch<{ status_code?: string }>(url.toString(), {
      provider: cfg.id,
      detectError: graphError,
    });
    if (st.status_code === "FINISHED") return;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
      throw new MediaError("Instagram: media processing failed", { provider: cfg.id });
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new MediaError("Instagram: media still processing (timeout)", {
    provider: cfg.id,
  });
}

export const instagramPublisher: Publisher = {
  async publish(
    tokens: TokenSet,
    input: PublishInput,
    ctx: PublishContext,
  ): Promise<PublishResult> {
    const id = igUserId(ctx);
    const mediaUrl = ctx.media.publicUrl(input.media.key);

    const containerId = await createContainer(id, input, mediaUrl, tokens.accessToken);
    await waitFinished(containerId, tokens.accessToken);

    const published = await apiFetch<{ id?: string }>(
      `${cfg.baseUrl}/${id}/media_publish`,
      {
        provider: cfg.id,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: tokens.accessToken,
        }).toString(),
        detectError: graphError,
      },
    );
    if (!published.id) {
      throw new PublishingError("Instagram: publish failed", { provider: cfg.id });
    }

    let permalink: string | null = null;
    try {
      const url = new URL(`${cfg.baseUrl}/${published.id}`);
      url.searchParams.set("fields", "permalink");
      url.searchParams.set("access_token", tokens.accessToken);
      const info = await apiFetch<{ permalink?: string }>(url.toString(), {
        provider: cfg.id,
      });
      permalink = info.permalink ?? null;
    } catch {
      // permalink is best-effort
    }

    return { platformPostId: published.id, platformUrl: permalink, state: "PUBLISHED" };
  },

  async getStatus(
    tokens: TokenSet,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    try {
      const url = new URL(`${cfg.baseUrl}/${platformPostId}`);
      url.searchParams.set("fields", "permalink");
      url.searchParams.set("access_token", tokens.accessToken);
      const info = await apiFetch<{ permalink?: string }>(url.toString(), {
        provider: cfg.id,
        detectError: graphError,
      });
      return { state: "PUBLISHED", platformUrl: info.permalink ?? null };
    } catch (e) {
      return { state: "FAILED", error: e instanceof Error ? e.message : "unknown" };
    }
  },

  async delete(tokens: TokenSet, platformPostId: string): Promise<void> {
    // Instagram Graph does not support deleting published media via API.
    void tokens;
    void platformPostId;
    throw new PublishingError("Instagram: API cannot delete published media", {
      provider: cfg.id,
    });
  },
};
