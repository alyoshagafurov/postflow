import fs from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./types";

const ROOT = path.join(process.cwd(), ".uploads");

function resolve(key: string): string {
  const normalized = path
    .normalize(key)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

function urlFor(key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `/api/storage/local/${encoded}`;
}

export const diskStorage: Storage = {
  async presignUpload({ key, contentType }) {
    return {
      key,
      uploadUrl: urlFor(key),
      method: "PUT",
      headers: { "Content-Type": contentType },
      publicUrl: urlFor(key),
    };
  },
  publicUrl(key) {
    return urlFor(key);
  },
  async getLocalPath(key) {
    return { path: resolve(key), cleanup: async () => {} };
  },
  async putObject(key, body) {
    const full = resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  },
  async readObject(key) {
    return fs.readFile(resolve(key));
  },
  async delete(key) {
    await fs.rm(resolve(key), { force: true });
  },
  async exists(key) {
    try {
      await fs.access(resolve(key));
      return true;
    } catch {
      return false;
    }
  },
};
