"use client";

import { ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";
import type { Platform } from "@prisma/client";

const GUIDES: Record<Platform, string[]> = {
  YOUTUBE: [
    "Откройте раздел «Аккаунты» и нажмите «Подключить» у YouTube.",
    "Войдите в аккаунт Google и разрешите доступ к загрузке видео.",
    "Канал появится в списке — можно публиковать сразу, без ревью.",
  ],
  TIKTOK: [
    "В разделе «Аккаунты» нажмите «Подключить» у TikTok.",
    "Войдите в TikTok и разрешите публикацию видео.",
    "Аккаунт будет отмечен «Ожидает верификации» до одобрения приложения TikTok — после этого публикация станет доступна.",
  ],
  INSTAGRAM: [
    "Переведите Instagram в режим Business или Creator и привяжите к странице Facebook.",
    "В разделе «Аккаунты» нажмите «Подключить» у Instagram и войдите через Facebook.",
    "Выберите страницу с привязанным бизнес-аккаунтом Instagram.",
    "Аккаунт будет отмечен «Ожидает верификации» до одобрения приложения Meta.",
  ],
};

const ORDER: Platform[] = ["YOUTUBE", "TIKTOK", "INSTAGRAM"];

export function PlatformGuides() {
  return (
    <Tabs defaultValue="YOUTUBE">
      <TabsList>
        {ORDER.map((p) => (
          <TabsTrigger key={p} value={p} className="gap-1.5">
            <span style={{ color: PLATFORM_META[p].color }}>
              <PlatformIcon platform={p} className="h-4 w-4" />
            </span>
            {PLATFORM_META[p].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {ORDER.map((p) => (
        <TabsContent key={p} value={p} className="mt-4">
          <ol className="space-y-4">
            {GUIDES[p].map((step, i) => (
              <li
                key={i}
                className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_200px]"
              >
                <div className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground">{step}</p>
                </div>
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  <ImageIcon className="mr-1.5 h-4 w-4" />
                  Скриншот
                </div>
              </li>
            ))}
          </ol>
        </TabsContent>
      ))}
    </Tabs>
  );
}
