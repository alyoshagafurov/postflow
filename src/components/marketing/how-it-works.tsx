import { AtSign, CalendarCheck, Upload } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    icon: AtSign,
    title: "Подключите аккаунты",
    text: "Добавьте TikTok, YouTube и Instagram за пару кликов. Токены хранятся в зашифрованном виде — доступ можно отозвать в любой момент.",
  },
  {
    icon: Upload,
    title: "Загрузите видео и настройте",
    text: "Выберите обложку из кадров ролика, добавьте описание и хэштеги. При желании — свой текст под каждую площадку и время выхода.",
  },
  {
    icon: CalendarCheck,
    title: "Публикация происходит сама",
    text: "В назначенное время PostFlow опубликует ролик во всех выбранных аккаунтах и пришлёт уведомление о результате.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border py-20 md:py-28">
      <div className="container">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Как это работает
          </h2>
          <p className="mt-3 text-muted-foreground">
            Три шага от загрузки до публикации во всех соцсетях.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-border bg-card/40 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-4xl font-semibold text-muted/40">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-medium">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
