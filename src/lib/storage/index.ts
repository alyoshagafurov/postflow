import { features } from "@/lib/env";
import { diskStorage } from "./disk";
import { s3Storage } from "./s3";
import type { Storage } from "./types";

/**
 * Active storage backend: S3/R2 when configured, otherwise local disk (dev).
 */
export const storage: Storage = features.s3 ? s3Storage : diskStorage;

export type { PresignedUpload, Storage } from "./types";
