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

const GRAPH = "https://graph.facebook.com/v21.0";
const AUTH_BASE = "https://www.facebook.com/v21.0/dialog/oauth";
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "business_management",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graph(path: string, params: Record<string, string>): Promise<any> {
  const url = `${GRAPH}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(`Instagram/Graph: ${data.error.message || res.status}`);
  }
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Instagram/Graph: ${data.error.message || res.status}`);
  }
  return data;
}

async function findInstagramAccount(userToken: string) {
  const pages = await graph("/me/accounts", {
    fields: "name,access_token,instagram_business_account",
    access_token: userToken,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = (pages.data ?? []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.instagram_business_account?.id,
  );
  if (!page) {
    throw new Error(
      "Не найден бизнес-аккаунт Instagram, привязанный к странице Facebook",
    );
  }
  return {
    igUserId: page.instagram_business_account.id as string,
    pageId: page.id as string,
    pageToken: page.access_token as string,
  };
}

export const instagramPublisher: Publisher = {
  platform: Platform.INSTAGRAM,

  isConfigured() {
    return features.instagram;
  },

  requiresReview() {
    return env.INSTAGRAM_APPROVED !== "true";
  },

  getAuthUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: redirectUri,
      scope: SCOPES.join(","),
      response_type: "code",
      state,
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async connect(code, redirectUri): Promise<ConnectedAccount> {
    const short = await graph("/oauth/access_token", {
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    });
    const long = await graph("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      fb_exchange_token: short.access_token,
    });
    const userToken: string = long.access_token;

    const { igUserId, pageId, pageToken } =
      await findInstagramAccount(userToken);

    const profile = await graph(`/${igUserId}`, {
      fields: "username,profile_picture_url",
      access_token: pageToken,
    });

    return {
      platformAccountId: igUserId,
      username: profile.username ?? null,
      displayName: profile.username ?? null,
      avatarUrl: profile.profile_picture_url ?? null,
      tokens: {
        accessToken: pageToken,
        refreshToken: userToken, // long-lived user token, to re-derive page token
        expiresAt: long.expires_in
          ? new Date(Date.now() + long.expires_in * 1000)
          : null,
        scope: SCOPES.join(","),
      },
      metadata: { igUserId, pageId },
    };
  },

  async refresh(tokens): Promise<PublisherTokens> {
    if (!tokens.refreshToken) throw new Error("Нет токена пользователя Meta");
    const { pageToken } = await findInstagramAccount(tokens.refreshToken);
    return {
      accessToken: pageToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
    };
  },

  async publish(
    tokens: PublisherTokens,
    ctx: PublishContext,
    account: PublishAccountRef,
  ): Promise<PublishResult> {
    const igUserId: string =
      (account.metadata?.igUserId as string) ?? account.platformAccountId;
    const videoUrl = storage.publicUrl(ctx.videoKey);

    // 1) create media container (Reels)
    const container = await graphPost(`/${igUserId}/media`, {
      media_type: "REELS",
      video_url: videoUrl,
      caption: ctx.caption,
      access_token: tokens.accessToken,
    });
    const creationId: string = container.id;
    if (!creationId) throw new Error("Instagram: не создан контейнер медиа");

    // 2) poll processing status until FINISHED
    let ready = false;
    for (let i = 0; i < 30; i++) {
      const st = await graph(`/${creationId}`, {
        fields: "status_code",
        access_token: tokens.accessToken,
      });
      if (st.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (st.status_code === "ERROR") {
        throw new Error("Instagram: ошибка обработки видео");
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    if (!ready) throw new Error("Instagram: видео всё ещё обрабатывается");

    // 3) publish
    const published = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: tokens.accessToken,
    });
    const mediaId: string = published.id;

    let permalink: string | null = null;
    try {
      const info = await graph(`/${mediaId}`, {
        fields: "permalink",
        access_token: tokens.accessToken,
      });
      permalink = info.permalink ?? null;
    } catch {
      // optional
    }

    return { platformPostId: mediaId, platformUrl: permalink, status: "PUBLISHED" };
  },

  async getStatus(
    tokens: PublisherTokens,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    try {
      const info = await graph(`/${platformPostId}`, {
        fields: "permalink",
        access_token: tokens.accessToken,
      });
      return { status: "PUBLISHED", url: info.permalink ?? null };
    } catch (e) {
      return {
        status: "FAILED",
        error: e instanceof Error ? e.message : "unknown",
      };
    }
  },
};
