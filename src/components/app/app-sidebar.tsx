"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { adminNav, mainNav, secondaryNav, type NavItem } from "@/config/nav";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {mainNav.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
          />
        ))}
        <div className="my-2 h-px bg-border" />
        {secondaryNav.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
          />
        ))}
        {isAdmin && (
          <SidebarNavLink
            item={adminNav}
            active={isActivePath(pathname, adminNav.href)}
          />
        )}
      </nav>
      <div className="px-6 py-4 text-xs text-muted-foreground">© PostFlow</div>
    </aside>
  );
}
