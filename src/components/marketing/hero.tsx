import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { ALL_PLATFORMS, PLATFORM_META } from "@/lib/platforms";

function HeroMock() {
  const rows = [
    { p: "TIKTOK" as const, handle: "@my.channel", status: "В очереди", tone: "text-primary" },
    { p: "YOUTUBE" as const, handle: "Мой канал", status: "Опубликовано", tone: "text-success" },
    { p: "INSTAGRAM" as const, handle: "@my.page", status: "В очереди", tone: "text-primary" },
  ];
  return (
    // Placeholder for a real product demo video/GIF.
    <div className="relative mx-auto max-w-4xl">
      <div className="rounded-2xl border border-border bg-card/70 p-2 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="h-3 w-3 rounded-full bg-destructive/60" />
          <span className="h-3 w-3 rounded-full bg-warning/60" />
          <span className="h-3 w-3 rounded-full bg-success/60" />
          <span className="ml-3 truncate text-xs text-muted-foreground">
            postflow.app/posts/new
          </span>
        </div>
        <div className="grid gap-4 rounded-xl bg-background/60 p-4 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/25 via-accent to-background">
            <div className="absolute inset-0 grid place-items-center text-foreground/70">
              <PlayCircle className="h-10 w-10" />
            </div>
            <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              0:28
            </span>
          </div>
          <div className="space-y-3 text-left">
            <div className="text-sm font-medium">Мой новый ролик 🎬</div>
            <div className="text-xs text-muted-foreground">
              Запланировано на сегодня, 18:00
            </div>
            <div className="space-y-2 pt-1">
              {rows.map((r) => (
                <div
                  key={r.p}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span style={{ color: PLATFORM_META[r.p].color }}>
                      <PlatformIcon platform={r.p} className="h-4 w-4" />
                    </span>
                    {r.handle}
                  </span>
                  <span className={`text-xs ${r.tone}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-accent" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container relative flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Автопубликация видео в соцсети
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Загрузи видео один раз — оно само выйдет в{" "}
            <span className="bg-gradient-to-r from-primary to-[#B79CFF] bg-clip-text text-transparent">
              TikTok, YouTube и Instagram
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
            PostFlow планирует и публикует ролики во всех ваших аккаунтах по
            расписанию. Настройте один раз — дальше всё происходит автоматически.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Начать бесплатно
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/#how">
                <PlayCircle className="mr-2 h-4 w-4" />
                Как это работает
              </Link>
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="text-xs text-muted-foreground">
            Бесплатно навсегда · Без карты · Отмена в любой момент
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-8 w-full">
          <HeroMock />
        </Reveal>

        <Reveal delay={0.3} className="mt-6">
          <div className="flex items-center gap-6 text-muted-foreground">
            <span className="text-xs uppercase tracking-wider">Работает с</span>
            {ALL_PLATFORMS.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: PLATFORM_META[p].color }}
              >
                <PlatformIcon platform={p} className="h-5 w-5" />
                <span className="hidden text-foreground/80 sm:inline">
                  {PLATFORM_META[p].label}
                </span>
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
