"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Обзор", href: "/admin" },
  { label: "Пользователи", href: "/admin/users" },
  { label: "Промокоды", href: "/admin/promos" },
  { label: "Ошибки", href: "/admin/errors" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {ITEMS.map((i) => {
        const active = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </div>
  );
}
