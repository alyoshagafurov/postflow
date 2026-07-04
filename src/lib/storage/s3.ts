import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { Storage } from "./types";

let cached: S3Client | null = null;
function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: env.S3_REGION || "auto",
    endpoint: env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return cached;
}

export const s3Storage: Storage = {
  async presignUpload({ key, contentType }) {
    const url = await getSignedUrl(
      client(),
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 3600 },
    );
    return {
      key,
      uploadUrl: url,
      method: "PUT",
      headers: { "Content-Type": contentType },
      publicUrl: s3Storage.publicUrl(key),
    };
  },
  publicUrl(key) {
    if (env.S3_PUBLIC_URL) return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
    return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
  },
  async getLocalPath(key) {
    const buf = await s3Storage.readObject(key);
    const tmp = path.join(
      os.tmpdir(),
      `pf-${crypto.randomBytes(8).toString("hex")}-${path.basename(key)}`,
    );
    await fs.writeFile(tmp, buf);
    return {
      path: tmp,
      cleanup: async () => {
        await fs.rm(tmp, { force: true });
      },
    };
  },
  async putObject(key, body, contentType) {
    await client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },
  async readObject(key) {
    const res = await client().send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  },
  async delete(key) {
    await client().send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    );
  },
  async exists(key) {
    try {
      await client().send(
        new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  },
};
