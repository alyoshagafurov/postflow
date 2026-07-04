import { z } from "zod";

export const MAX_VIDEO_BYTES = 512 * 1024 * 1024; // 512 MB
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const presignSchema = z.object({
  kind: z.enum(["video", "cover"]),
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export const createPostSchema = z.object({
  videoKey: z.string().min(1).max(300),
  videoMime: z.string().max(100).optional(),
  videoSizeBytes: z.number().int().nonnegative().optional(),
});

export const targetInputSchema = z.object({
  socialAccountId: z.string().min(1),
  title: z.string().max(200).nullish(),
  caption: z.string().max(5000).nullish(),
  hashtags: z.string().max(1000).nullish(),
});

export const updatePostSchema = z.object({
  title: z.string().max(200).nullish(),
  description: z.string().max(5000).nullish(),
  hashtags: z.string().max(1000).nullish(),
  coverKey: z.string().max(300).nullish(),
  perPlatformText: z.boolean().optional(),
  targetAccountIds: z.array(z.string()).max(50).optional(),
  targets: z.array(targetInputSchema).max(50).optional(),
  publishNow: z.boolean().optional(),
  scheduledAt: z.string().datetime().nullish(),
  timezone: z.string().max(64).nullish(),
  consent: z.boolean().optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type TargetInput = z.infer<typeof targetInputSchema>;
