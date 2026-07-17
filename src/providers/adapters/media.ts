/** MediaResolver backed by the app's storage layer (S3/R2 or disk). */
import { storage } from "@/lib/storage";
import type { MediaResolver } from "../core/types";

export const storageMediaResolver: MediaResolver = {
  publicUrl: (key) => storage.publicUrl(key),
  localPath: (key) => storage.getLocalPath(key),
};
