import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

// Allow explicit binary paths (useful when not on PATH); otherwise fluent-ffmpeg
// resolves `ffmpeg`/`ffprobe` from PATH.
if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

export type VideoProbe = {
  durationSec: number;
  width: number;
  height: number;
};

export function probeVideo(filePath: string): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find((s) => s.width && s.height);
      const durationSec = Math.round(Number(data.format?.duration) || 0);
      resolve({
        durationSec,
        width: stream?.width ?? 0,
        height: stream?.height ?? 0,
      });
    });
  });
}

export type ExtractedFrame = { path: string; timestampSec: number };

/**
 * Extract `count` evenly-spaced JPEG frames from a video into `outDir`.
 */
export function extractFrames(
  filePath: string,
  opts: { count: number; durationSec: number; outDir: string; width?: number },
): Promise<ExtractedFrame[]> {
  const { count, durationSec, outDir, width = 720 } = opts;
  const safeDuration = durationSec > 0 ? durationSec : 10;
  const timestamps = Array.from({ length: count }, (_, i) => {
    const frac = (i + 1) / (count + 1);
    return Math.max(0, Number((frac * safeDuration).toFixed(2)));
  });

  return new Promise((resolve, reject) => {
    const filenames: string[] = [];
    ffmpeg(filePath)
      .on("filenames", (names: string[]) => filenames.push(...names))
      .on("end", () => {
        resolve(
          timestamps.map((t, i) => ({
            path: path.join(outDir, filenames[i] ?? `frame-${i + 1}.jpg`),
            timestampSec: t,
          })),
        );
      })
      .on("error", reject)
      .screenshots({
        timestamps,
        folder: outDir,
        filename: "frame-%i.jpg",
        size: `${width}x?`,
      });
  });
}
