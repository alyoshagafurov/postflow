import { createReadStream } from "node:fs";
import { youtube, type youtube_v3 } from "@googleapis/youtube";
import { OAuth2Client } from "google-auth-library";
import { Platform } from "@prisma/client";
import { features } from "@/lib/env";
import { storage } from "@/lib/storage";
import { googleOAuthClient, YOUTUBE_SCOPES } from "./google-oauth";
import type {
  ConnectedAccount,
  PublishAccountRef,
  PublishContext,
  PublishResult,
  PublishStatusResult,
  Publisher,
  PublisherTokens,
} from "./types";

function clientWithTokens(tokens: PublisherTokens): OAuth2Client {
  const client = googleOAuthClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiresAt ? tokens.expiresAt.getTime() : undefined,
    scope: tokens.scope ?? undefined,
  });
  return client;
}

// @googleapis/youtube bundles its own google-auth-library copy; the OAuth2Client
// shapes are identical at runtime, so cast across the duplicated type decls.
function ytClient(auth: OAuth2Client) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return youtube({ version: "v3", auth: auth as any });
}

export const youtubePublisher: Publisher = {
  platform: Platform.YOUTUBE,

  isConfigured() {
    return features.youtube;
  },

  getAuthUrl(state, redirectUri) {
    const client = googleOAuthClient(redirectUri);
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: YOUTUBE_SCOPES,
      state,
    });
  },

  async connect(code, redirectUri): Promise<ConnectedAccount> {
    const client = googleOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const yt = ytClient(client);
    const res = await yt.channels.list({
      part: ["snippet", "contentDetails"],
      mine: true,
    });
    const channel = res.data.items?.[0];
    if (!channel?.id) {
      throw new Error("Не удалось получить канал YouTube");
    }

    return {
      platformAccountId: channel.id,
      username: channel.snippet?.customUrl ?? channel.snippet?.title ?? null,
      displayName: channel.snippet?.title ?? null,
      avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
      tokens: {
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? null,
      },
      metadata: { channelId: channel.id },
    };
  },

  async refresh(tokens): Promise<PublisherTokens> {
    if (!tokens.refreshToken) {
      throw new Error("Нет refresh-токена — требуется повторная авторизация");
    }
    const client = googleOAuthClient();
    client.setCredentials({ refresh_token: tokens.refreshToken });
    await client.getAccessToken();
    const c = client.credentials;
    return {
      accessToken: c.access_token ?? tokens.accessToken,
      refreshToken: c.refresh_token ?? tokens.refreshToken,
      expiresAt: c.expiry_date ? new Date(c.expiry_date) : null,
      scope: c.scope ?? tokens.scope ?? null,
    };
  },

  async publish(
    tokens: PublisherTokens,
    ctx: PublishContext,
    _account: PublishAccountRef,
  ): Promise<PublishResult> {
    const client = clientWithTokens(tokens);
    const yt = ytClient(client);

    const status: youtube_v3.Schema$VideoStatus = {
      selfDeclaredMadeForKids: false,
    };
    if (!ctx.publishNow && ctx.scheduledAt) {
      // Scheduled: must be private with a publishAt timestamp.
      status.privacyStatus = "private";
      status.publishAt = ctx.scheduledAt.toISOString();
    } else {
      status.privacyStatus = ctx.privacy;
    }

    const { path, cleanup } = await storage.getLocalPath(ctx.videoKey);
    try {
      const res = await yt.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: ctx.title || "Video",
            description: ctx.description,
            tags: ctx.tags,
          },
          status,
        },
        media: {
          mimeType: ctx.videoMime ?? "video/*",
          body: createReadStream(path),
        },
      });

      const id = res.data.id;
      if (!id) throw new Error("YouTube не вернул ID видео");
      const uploadStatus = res.data.status?.uploadStatus;
      if (uploadStatus === "failed" || uploadStatus === "rejected") {
        throw new Error(
          `YouTube отклонил видео: ${res.data.status?.rejectionReason ?? res.data.status?.failureReason ?? uploadStatus}`,
        );
      }
      // Insert succeeded → the video is on YouTube; further encoding is async.
      return {
        platformPostId: id,
        platformUrl: `https://youtu.be/${id}`,
        status: "PUBLISHED",
      };
    } finally {
      await cleanup();
    }
  },

  async getStatus(
    tokens: PublisherTokens,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    const client = clientWithTokens(tokens);
    const yt = ytClient(client);
    const res = await yt.videos.list({
      part: ["status", "processingDetails"],
      id: [platformPostId],
    });
    const item = res.data.items?.[0];
    const uploadStatus = item?.status?.uploadStatus;
    const url = `https://youtu.be/${platformPostId}`;

    if (uploadStatus === "processed") return { status: "PUBLISHED", url };
    if (uploadStatus === "failed" || uploadStatus === "rejected") {
      return {
        status: "FAILED",
        error: item?.status?.failureReason ?? item?.status?.rejectionReason ?? "rejected",
      };
    }
    return { status: "PROCESSING", url };
  },
};
