import { promises as fs } from "node:fs";
import { Platform } from "@prisma/client";
import { env, features } from "@/lib/env";
import { storage } from "@/lib/storage";
import type {
  ConnectedAccount,
  PublishAccountRef,
  PublishContext,
  PublishResult,
  PublishStatusResult,
  Publisher,
  PublisherTokens,
} from "./types";

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";
const SCOPES = ["user.info.basic", "video.publish", "video.upload"];
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`TikTok OAuth: ${data.error_description || data.error || res.status}`);
  }
  return data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    open_id: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiPost(token: string, path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error && data.error.code && data.error.code !== "ok") {
    throw new Error(`TikTok: ${data.error.message || data.error.code}`);
  }
  return data;
}

export const tiktokPublisher: Publisher = {
  platform: Platform.TIKTOK,

  isConfigured() {
    return features.tiktok;
  },

  requiresReview() {
    // Direct Post requires TikTok app review; until then accounts are pending.
    return env.TIKTOK_APPROVED !== "true";
  },

  getAuthUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      scope: SCOPES.join(","),
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async connect(code, redirectUri): Promise<ConnectedAccount> {
    const token = await tokenRequest({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const infoRes = await fetch(
      `${API}/user/info/?fields=open_id,union_id,avatar_url,display_name`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const info = await infoRes.json();
    const u = info?.data?.user ?? {};

    return {
      platformAccountId: token.open_id,
      username: u.display_name ?? null,
      displayName: u.display_name ?? null,
      avatarUrl: u.avatar_url ?? null,
      tokens: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
      },
      metadata: { openId: token.open_id },
    };
  },

  async refresh(tokens): Promise<PublisherTokens> {
    if (!tokens.refreshToken) throw new Error("Нет refresh-токена TikTok");
    const t = await tokenRequest({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    });
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token ?? tokens.refreshToken,
      expiresAt: new Date(Date.now() + t.expires_in * 1000),
      scope: t.scope ?? tokens.scope ?? null,
    };
  },

  async publish(
    tokens: PublisherTokens,
    ctx: PublishContext,
    _account: PublishAccountRef,
  ): Promise<PublishResult> {
    // 1) creator_info/query is required by TikTok before every publish.
    await apiPost(tokens.accessToken, "/post/publish/creator_info/query/", {});

    const { path, cleanup } = await storage.getLocalPath(ctx.videoKey);
    try {
      const stat = await fs.stat(path);
      const size = stat.size;
      const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));
      const chunkSize = totalChunks === 1 ? size : CHUNK_SIZE;

      // 2) init Direct Post with FILE_UPLOAD source
      const init = await apiPost(
        tokens.accessToken,
        "/post/publish/video/init/",
        {
          post_info: {
            title: ctx.caption || ctx.title,
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
      const publishId: string = init?.data?.publish_id;
      const uploadUrl: string = init?.data?.upload_url;
      if (!publishId || !uploadUrl) {
        throw new Error("TikTok: не удалось инициализировать загрузку");
      }

      // 3) upload the file in chunks
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
              "Content-Type": ctx.videoMime ?? "video/mp4",
              "Content-Length": String(len),
              "Content-Range": `bytes ${start}-${end}/${size}`,
            },
            body: buf,
          });
          if (!up.ok && up.status !== 201 && up.status !== 206) {
            throw new Error(`TikTok upload chunk ${i} failed: ${up.status}`);
          }
        }
      } finally {
        await fh.close();
      }

      // 4) poll status
      const status = await pollStatus(tokens.accessToken, publishId);
      return {
        platformPostId: publishId,
        platformUrl: null,
        status: status === "PUBLISH_COMPLETE" ? "PUBLISHED" : "PROCESSING",
      };
    } finally {
      await cleanup();
    }
  },

  async getStatus(
    tokens: PublisherTokens,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    const data = await apiPost(
      tokens.accessToken,
      "/post/publish/status/fetch/",
      { publish_id: platformPostId },
    );
    const s = data?.data?.status;
    if (s === "PUBLISH_COMPLETE") return { status: "PUBLISHED" };
    if (s === "FAILED")
      return { status: "FAILED", error: data?.data?.fail_reason || "failed" };
    return { status: "PROCESSING" };
  },
};

async function pollStatus(token: string, publishId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const data = await apiPost(token, "/post/publish/status/fetch/", {
      publish_id: publishId,
    });
    const s = data?.data?.status;
    if (s === "PUBLISH_COMPLETE" || s === "FAILED") return s;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return "PROCESSING";
}
