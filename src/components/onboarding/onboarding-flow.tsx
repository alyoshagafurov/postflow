"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AtSign, Loader2, Send, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";

const STEPS = [
  {
    icon: AtSign,
    title: "Подключите аккаунты",
    text: "TikTok, YouTube и Instagram — сколько угодно аккаунтов.",
  },
  {
    icon: Upload,
    title: "Загрузите видео",
    text: "Обложка, описание, хэштеги и время публикации.",
  },
  {
    icon: Send,
    title: "Публикация сама",
    text: "Видео выйдет в нужное время во всех выбранных аккаунтах.",
  },
];

export function OnboardingFlow({ firstName }: { firstName?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "connect" | "skip">(null);

  async function go(target: string, which: "connect" | "skip") {
    setLoading(which);
    try {
      await fetch("/api/me/onboarding", { method: "POST" });
    } catch {
      // non-blocking
    }
    router.push(target);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-accent" />
      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Logo href={null} />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Добро пожаловать{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Три шага — и ваши видео начнут выходить сами.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.title}>
                <CardContent className="space-y-3 pt-6">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Шаг {i + 1}
                  </div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          YouTube работает сразу. TikTok и Instagram потребуют верификации
          аккаунта после прохождения ревью платформы.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            disabled={loading !== null}
            onClick={() => go("/accounts", "connect")}
          >
            {loading === "connect" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Подключить первый аккаунт
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            disabled={loading !== null}
            onClick={() => go("/dashboard", "skip")}
          >
            {loading === "skip" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Пропустить пока
          </Button>
        </div>
      </div>
    </div>
  );
}
