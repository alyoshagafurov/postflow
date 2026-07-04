import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { storage } from "@/lib/storage";
import { extractFrames, probeVideo, type VideoProbe } from "./ffmpeg";

export type GeneratedCover = {
  key: string;
  url: string;
  timestampSec: number;
};

export type CoverGenerationResult = {
  probe: VideoProbe;
  covers: GeneratedCover[];
};

/**
 * Probe a stored video and generate `count` candidate cover frames, uploading
 * each to storage. Cleans up all temporary files.
 */
export async function generateCovers(
  videoKey: string,
  userId: string,
  count = 4,
): Promise<CoverGenerationResult> {
  const { path: videoPath, cleanup } = await storage.getLocalPath(videoKey);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pf-cov-"));
  try {
    const probe = await probeVideo(videoPath);
    const frames = await extractFrames(videoPath, {
      count,
      durationSec: probe.durationSec,
      outDir: tmpDir,
    });

    const covers: GeneratedCover[] = [];
    for (const frame of frames) {
      let buf: Buffer;
      try {
        buf = await fs.readFile(frame.path);
      } catch {
        continue; // frame may be missing if ffmpeg skipped a timestamp
      }
      const key = `uploads/${userId}/covers/${crypto
        .randomBytes(10)
        .toString("hex")}.jpg`;
      await storage.putObject(key, buf, "image/jpeg");
      covers.push({
        key,
        url: storage.publicUrl(key),
        timestampSec: frame.timestampSec,
      });
    }

    return { probe, covers };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    await cleanup();
  }
}
