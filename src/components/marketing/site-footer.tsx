import Link from "next/link";
import { Logo } from "@/components/brand/logo";

type FooterLink = { label: string; href: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Продукт",
    links: [
      { label: "Возможности", href: "/#features" },
      { label: "Тарифы", href: "/#pricing" },
      { label: "Как пользоваться", href: "/help" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "Контакты", href: "mailto:support@postflow.app", external: true },
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Загрузи видео один раз — оно выйдет в TikTok, YouTube и Instagram
              по расписанию.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <div className="text-sm font-medium">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} PostFlow. Все права защищены.</span>
          <span>Сделано для авторов</span>
        </div>
      </div>
    </footer>
  );
}
