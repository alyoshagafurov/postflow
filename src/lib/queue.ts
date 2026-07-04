import { Queue } from "bullmq";
import { env, features } from "@/lib/env";

export const PUBLISH_QUEUE = "publish";

export type PublishJobData = { publicationId: string };

/**
 * Plain connection options for BullMQ (parsed from REDIS_URL). Passed as an
 * object — not an ioredis instance — so BullMQ builds the client with its own
 * bundled ioredis copy and there's no dual-package type clash.
 */
export function redisConnection() {
  const u = new URL(env.REDIS_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    maxRetriesPerRequest: null as null,
    ...(u.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

let publishQueue: Queue | null = null;

export function getPublishQueue(): Queue | null {
  if (!features.redis) return null;
  if (!publishQueue) {
    publishQueue = new Queue(PUBLISH_QUEUE, { connection: redisConnection() });
  }
  return publishQueue;
}
