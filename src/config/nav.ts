import {
  AtSign,
  CalendarDays,
  Clapperboard,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { label: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { label: "Аккаунты", href: "/accounts", icon: AtSign },
  { label: "Посты", href: "/posts", icon: Clapperboard },
  { label: "Календарь", href: "/calendar", icon: CalendarDays },
  { label: "Биллинг", href: "/billing", icon: CreditCard },
];

export const secondaryNav: NavItem[] = [
  { label: "Как пользоваться", href: "/help", icon: LifeBuoy },
  { label: "Настройки", href: "/settings", icon: Settings },
];

export const adminNav: NavItem = {
  label: "Админка",
  href: "/admin",
  icon: ShieldCheck,
};
