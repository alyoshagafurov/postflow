import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";

const FAQ = [
  {
    q: "Безопасно ли подключать мои аккаунты?",
    a: "Да. Мы используем только официальные API платформ и OAuth — вы не передаёте нам пароли. Токены доступа шифруются алгоритмом AES-256 и расшифровываются только в момент публикации. Отозвать доступ можно в любой момент из раздела «Аккаунты».",
  },
  {
    q: "Что будет, если видео не опубликуется?",
    a: "Вы увидите понятную причину (например, истёк токен, превышен лимит платформы или неподходящий формат видео) и сможете повторить публикацию одной кнопкой. О результате придёт уведомление.",
  },
  {
    q: "Можно ли отменить запланированную публикацию?",
    a: "Да, запланированную публикацию можно отменить или перенести в любой момент до её отправки — прямо из календаря или списка публикаций.",
  },
  {
    q: "Нужно ли сразу платить?",
    a: "Нет. Бесплатный тариф позволяет публиковать 1 видео в день без привязки карты. Перейти на платный тариф можно в любой момент, когда понадобится больше публикаций.",
  },
  {
    q: "Сколько аккаунтов можно подключить?",
    a: "Неограниченно на всех тарифах. Лимит считается по количеству публикаций в день, а не по числу аккаунтов.",
  },
  {
    q: "Какие форматы видео поддерживаются?",
    a: "Вертикальные ролики (9:16) — для TikTok, YouTube Shorts и Instagram Reels — в форматах MP4/MOV. Перед публикацией вы всегда видите превью, как ролик будет выглядеть на каждой платформе.",
  },
  {
    q: "TikTok и Instagram работают сразу?",
    a: "YouTube доступен сразу. Публикация в TikTok и Instagram требует прохождения ревью приложения этими платформами — до его завершения аккаунты помечаются как «ожидают верификации».",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-border py-20 md:py-28">
      <div className="container max-w-3xl">
        <Reveal className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Частые вопросы
          </h2>
          <p className="mt-3 text-muted-foreground">
            Не нашли ответ? Напишите на support@postflow.app
          </p>
        </Reveal>
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
