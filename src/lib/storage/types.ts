export type PresignedUpload = {
  key: string;
  uploadUrl: string;
  method: "PUT";
  headers?: Record<string, string>;
  publicUrl: string;
};

export type LocalFile = {
  path: string;
  cleanup: () => Promise<void>;
};

/**
 * Storage abstraction. Backed by S3/R2 in production and by local disk in dev
 * (so the full upload → ffmpeg → publish flow works without cloud credentials).
 */
export interface Storage {
  /** A URL the browser can PUT the file to directly. */
  presignUpload(opts: {
    key: string;
    contentType: string;
  }): Promise<PresignedUpload>;
  /** Publicly reachable URL for a stored object. */
  publicUrl(key: string): string;
  /** Materialize the object on local disk for server-side processing (ffmpeg). */
  getLocalPath(key: string): Promise<LocalFile>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  readObject(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
