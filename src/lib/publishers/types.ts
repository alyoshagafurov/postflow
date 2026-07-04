import type { Platform } from "@prisma/client";

export type PublisherTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
};

export type ConnectedAccount = {
  platformAccountId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  tokens: PublisherTokens;
  metadata?: Record<string, unknown>;
};

export type PublishContext = {
  title: string;
  description: string;
  caption: string;
  tags: string[];
  privacy: "public" | "private" | "unlisted";
  publishNow: boolean;
  scheduledAt?: Date | null;
  videoKey: string;
  videoMime?: string | null;
};

export type PublishResult = {
  platformPostId: string;
  platformUrl?: string | null;
  status: "PUBLISHED" | "PROCESSING";
};

export type PublishStatusResult = {
  status: "PUBLISHED" | "PROCESSING" | "FAILED";
  url?: string | null;
  error?: string;
};

export type PublishAccountRef = {
  platformAccountId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
};

/** Raised by publishers when an account still awaits platform app review. */
export class PlatformNotVerifiedError extends Error {
  constructor(platform: Platform) {
    super(
      `Аккаунт ${platform} ожидает верификации платформы. Публикация станет доступна после прохождения ревью.`,
    );
    this.name = "PlatformNotVerifiedError";
  }
}

export interface Publisher {
  platform: Platform;
  /** Whether this integration is configured (credentials present). */
  isConfigured(): boolean;
  /** Whether connected accounts must await platform app review before posting. */
  requiresReview?(): boolean;
  /** Google/TikTok/Meta OAuth consent URL. */
  getAuthUrl(state: string, redirectUri: string): string;
  /** Exchange an OAuth code for account details + tokens. */
  connect(code: string, redirectUri: string): Promise<ConnectedAccount>;
  /** Refresh an expired access token. */
  refresh(tokens: PublisherTokens): Promise<PublisherTokens>;
  /** Upload/publish a video. */
  publish(
    tokens: PublisherTokens,
    ctx: PublishContext,
    account: PublishAccountRef,
  ): Promise<PublishResult>;
  /** Poll the platform for the status of a published item. */
  getStatus(
    tokens: PublisherTokens,
    platformPostId: string,
  ): Promise<PublishStatusResult>;
}
