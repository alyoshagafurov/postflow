/**
 * Universal publishing pipeline.
 *
 * The application calls these methods; each provider translates them into its
 * own API internally. The app never knows platform specifics. Retries, error
 * mapping, and logging are applied uniformly here.
 */
import { NotImplementedError, ProviderError, isProviderError } from "./errors";
import { createLogger, type Logger } from "./logger";
import { withRetry } from "./retry";
import type {
  MediaResolver,
  PublishContext,
  PublishInput,
  PublishResult,
  PublishStatusResult,
  SocialProvider,
  TokenSet,
} from "./types";

export interface PipelineDeps {
  media: MediaResolver;
  logger?: Logger;
  retries?: number;
}

export class PublishingPipeline {
  private readonly media: MediaResolver;
  private readonly logger: Logger;
  private readonly retries: number;

  constructor(deps: PipelineDeps) {
    this.media = deps.media;
    this.logger = deps.logger ?? createLogger("publishing");
    this.retries = deps.retries ?? 2;
  }

  private context(
    provider: SocialProvider,
    accountId: string,
    targetMeta?: Record<string, unknown>,
  ): PublishContext {
    return {
      accountId,
      targetMeta,
      media: this.media,
      logger: this.logger.child({ provider: provider.id, accountId }),
    };
  }

  async publish(
    provider: SocialProvider,
    tokens: TokenSet,
    input: PublishInput,
    account: { accountId: string; targetMeta?: Record<string, unknown> },
  ): Promise<PublishResult> {
    const ctx = this.context(provider, account.accountId, account.targetMeta);
    this.logger.info("publish start", {
      provider: provider.id,
      accountId: account.accountId,
      mediaKind: input.media.kind,
    });
    try {
      const result = await withRetry(
        () => provider.publisher.publish(tokens, input, ctx),
        { retries: this.retries, logger: this.logger },
      );
      this.logger.info("publish done", {
        provider: provider.id,
        state: result.state,
        platformPostId: result.platformPostId,
      });
      return result;
    } catch (error) {
      throw this.normalize(provider.id, error);
    }
  }

  async getStatus(
    provider: SocialProvider,
    tokens: TokenSet,
    platformPostId: string,
  ): Promise<PublishStatusResult> {
    try {
      return await withRetry(
        () => provider.publisher.getStatus(tokens, platformPostId),
        { retries: this.retries, logger: this.logger },
      );
    } catch (error) {
      throw this.normalize(provider.id, error);
    }
  }

  async remove(
    provider: SocialProvider,
    tokens: TokenSet,
    platformPostId: string,
    account: { accountId: string; targetMeta?: Record<string, unknown> },
  ): Promise<void> {
    if (!provider.publisher.delete) {
      throw new NotImplementedError(`${provider.id} does not support delete`, {
        provider: provider.id,
      });
    }
    const ctx = this.context(provider, account.accountId, account.targetMeta);
    try {
      await provider.publisher.delete(tokens, platformPostId, ctx);
    } catch (error) {
      throw this.normalize(provider.id, error);
    }
  }

  private normalize(providerId: string, error: unknown): ProviderError {
    if (isProviderError(error)) return error;
    const message = error instanceof Error ? error.message : "Publishing failed";
    return new ProviderError(message, {
      provider: providerId,
      code: "PUBLISHING",
      cause: error,
    });
  }
}
