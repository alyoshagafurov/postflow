import type { Metadata } from "next";

export const metadata: Metadata = { title: "Условия использования" };

export default function TermsPage() {
  return (
    <article className="container max-w-3xl space-y-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Условия использования
        </h1>
        <p className="text-sm text-muted-foreground">Обновлено: 2 июля 2026</p>
      </header>

      <p className="text-sm text-muted-foreground">
        Это шаблон пользовательского соглашения PostFlow. Перед запуском его
        следует адаптировать и проверить с юристом.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Использование сервиса</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PostFlow помогает планировать и публиковать видео в подключённых
          соцсетях. Вы отвечаете за контент, который публикуете, и за соблюдение
          правил каждой платформы.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Согласие на публикацию</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Публикация происходит только после вашего явного подтверждения. Вы
          подтверждаете, что обладаете правами на публикуемый контент.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Тарифы и оплата</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Бесплатный тариф доступен без оплаты. Платные подписки оформляются
          через Stripe и могут быть отменены в любой момент — доступ сохранится
          до конца оплаченного периода.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Ограничение ответственности</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Сервис предоставляется «как есть». Мы не несём ответственности за
          изменения политик платформ, из-за которых публикация может быть
          отклонена. О таких случаях мы сообщаем понятным сообщением об ошибке.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Контакты</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          По вопросам условий: support@postflow.app.
        </p>
      </section>
    </article>
  );
}
