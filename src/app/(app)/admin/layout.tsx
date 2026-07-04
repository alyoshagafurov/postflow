import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div>
      <PageHeader title="Админка" description="Управление платформой PostFlow." />
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
