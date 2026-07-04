import type { Metadata } from "next";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

export default function PrivacyPage() {
  return (
    <article className="container max-w-3xl space-y-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-muted-foreground">Обновлено: 2 июля 2026</p>
      </header>

      <p className="text-sm text-muted-foreground">
        Это шаблон политики конфиденциальности PostFlow. Перед запуском проекта
        его следует адаптировать под ваши реалии и проверить с юристом.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Какие данные мы обрабатываем</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Email и имя (для аккаунта), зашифрованные токены доступа к подключённым
          соцсетям, загруженные вами видео и метаданные публикаций, а также
          технические логи действий для обеспечения безопасности.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Как мы защищаем токены</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Токены соцсетей хранятся в зашифрованном виде (AES-256) и
          расшифровываются только в момент публикации. Мы не запрашиваем и не
          храним ваши пароли от соцсетей — используется официальный OAuth.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Передача третьим лицам</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мы передаём данные только платформам (TikTok, YouTube, Instagram) для
          публикации по вашему явному запросу и платёжному провайдеру (Stripe)
          для обработки подписок. Мы не продаём ваши данные.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Ваши права</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Вы можете отключить любой аккаунт соцсети, удалить публикации и
          запросить удаление учётной записи. Для этого напишите на
          support@postflow.app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Контакты</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          По вопросам конфиденциальности: support@postflow.app.
        </p>
      </section>
    </article>
  );
}
