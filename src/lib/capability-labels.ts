import type { Capability } from "@/providers/core/capabilities";

/** Russian labels for provider capabilities, for UI chips. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  video: "Видео",
  image: "Фото",
  carousel: "Карусель",
  stories: "Истории",
  reels: "Reels",
  shorts: "Shorts",
  threads: "Треды",
  livestream: "Эфиры",
  comments: "Комментарии",
  analytics: "Аналитика",
  dm: "Сообщения",
  webhooks: "Webhooks",
  drafts: "Черновики",
  scheduling: "Планирование",
};
