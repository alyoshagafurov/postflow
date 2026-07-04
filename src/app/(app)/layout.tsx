import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/session";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { TimezoneSync } from "@/components/app/timezone-sync";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === Role.ADMIN;
  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar user={user} isAdmin={isAdmin} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <TimezoneSync />
    </div>
  );
}
