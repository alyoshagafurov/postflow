import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlatformGuides } from "@/components/help/platform-guides";
import { SupportForm } from "@/components/help/support-form";

export const metadata: Metadata = { title: "Как пользоваться" };

const PROBLEMS = [
  {
    q: "Токен аккаунта истёк",
    a: "Откройте «Аккаунты» — аккаунт с истёкшим токеном помечен статусом «Токен истёк». Нажмите «Переподключить» и заново авторизуйтесь.",
  },
  {
    q: "Видео не опубликовалось",
    a: "Перейдите в «Календарь» → раздел «Ошибки публикации». Там указана причина и есть кнопка «Повторить». Частые причины: истёк токен, неподходящий формат, лимит платформы.",
  },
  {
    q: "Достигнут дневной лимит",
    a: "На бесплатном тарифе доступна 1 публикация в день. В разделе «Биллинг» можно повысить тариф или включить перенос публикаций на следующий день.",
  },
  {
    q: "Аккаунт ожидает верификации",
    a: "Публикация в TikTok и Instagram требует прохождения ревью приложения этими платформами. До одобрения аккаунты помечены как «Ожидает верификации», и публикация в них недоступна. YouTube работает сразу.",
  },
  {
    q: "Неподходящий формат видео",
    a: "Используйте вертикальные ролики 9:16 в форматах MP4/MOV. Перед публикацией доступно превью, как видео будет выглядеть на каждой платформе.",
  },
];

export default async function HelpPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Как пользоваться"
        description="Гайды по подключению платформ и ответы на частые вопросы."
      />

      <div className="mb-8">
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-muted-foreground">
          <div className="text-center">
            <PlayCircle className="mx-auto h-10 w-10" />
            <p className="mt-2 text-sm">Видео-инструкция скоро</p>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Подключение платформ</h2>
        <PlatformGuides />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Частые проблемы</h2>
        <Accordion type="single" collapsible className="w-full">
          {PROBLEMS.map((item, i) => (
            <AccordionItem key={i} value={`p-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Поддержка</CardTitle>
        </CardHeader>
        <CardContent>
          <SupportForm supportEmail={env.SUPPORT_EMAIL} />
        </CardContent>
      </Card>
    </div>
  );
}
