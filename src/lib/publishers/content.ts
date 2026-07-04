import type { Post, PostTarget } from "@prisma/client";

function parseTags(hashtags?: string | null): string[] {
  if (!hashtags) return [];
  return hashtags
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 15);
}

/**
 * Resolve the effective text for a target, honouring per-platform overrides
 * when the post is in per-platform mode, otherwise the shared post text.
 */
export function resolveContent(
  post: Pick<
    Post,
    "title" | "description" | "hashtags" | "perPlatformText"
  >,
  target?: Pick<PostTarget, "title" | "caption" | "hashtags"> | null,
) {
  const perPlatform = post.perPlatformText && target;
  const title =
    (perPlatform ? target?.title : null) || post.title || "Без названия";
  const caption =
    (perPlatform ? target?.caption : null) || post.description || "";
  const hashtags =
    (perPlatform ? target?.hashtags : null) || post.hashtags || "";
  const tags = parseTags(hashtags);
  const description = [caption, hashtags].filter(Boolean).join("\n\n");

  return {
    title: title.slice(0, 100),
    caption: [caption, hashtags].filter(Boolean).join(" ").slice(0, 2200),
    description: description.slice(0, 4900),
    tags,
  };
}
