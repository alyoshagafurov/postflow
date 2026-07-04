"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { UserNav, type UserNavData } from "@/components/app/user-nav";
import { SidebarNavLink } from "@/components/app/app-sidebar";
import { adminNav, mainNav, secondaryNav } from "@/config/nav";

export function AppTopbar({
  user,
  isAdmin,
}: {
  user: UserNavData;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = [...mainNav, ...secondaryNav, ...(isAdmin ? [adminNav] : [])];
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Меню</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center px-6">
            <Logo />
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {items.map((item) => (
              <SidebarNavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="md:hidden">
        <Logo showText={false} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <UserNav user={user} />
      </div>
    </header>
  );
}
