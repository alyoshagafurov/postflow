import {
  CalendarClock,
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  Type,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  {
    icon: Users,
    title: "Мультиаккаунты",
    text: "Сколько угодно аккаунтов на всех платформах. Лимит — по числу публикаций, а не по числу аккаунтов.",
  },
  {
    icon: CalendarClock,
    title: "Планирование по времени",
    text: "Ставьте публикации в очередь на нужную дату и время с учётом вашего часового пояса.",
  },
  {
    icon: ImageIcon,
    title: "Кастомная обложка",
    text: "Автоматически предложим кадры из видео на выбор — или загрузите свою картинку.",
  },
  {
    icon: Share2,
    title: "Все платформы разом",
    text: "Один ролик — сразу в TikTok, YouTube и Instagram. Выбирайте нужные аккаунты галочками.",
  },
  {
    icon: Type,
    title: "Текст под каждую площадку",
    text: "Единый текст для всех или отдельные заголовки, описания и хэштеги для каждой платформы.",
  },
  {
    icon: ShieldCheck,
    title: "Безопасность токенов",
    text: "Токены шифруются AES-256 и расшифровываются только в момент публикации. Полный аудит действий.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border py-20 md:py-28">
      <div className="container">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Всё для регулярного контента
          </h2>
          <p className="mt-3 text-muted-foreground">
            Инструменты, которые экономят часы на ручной публикации.
          </p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-primary/40">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.text}
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
