import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Пользователи · Админка" };

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { socialAccounts: true, posts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Тариф</TableHead>
            <TableHead className="text-right">Аккаунтов</TableHead>
            <TableHead className="text-right">Постов</TableHead>
            <TableHead className="text-right">Регистрация</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.email}
                {u.name ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {u.name}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                {u.role === "ADMIN" ? (
                  <Badge variant="secondary">ADMIN</Badge>
                ) : (
                  <span className="text-muted-foreground">USER</span>
                )}
              </TableCell>
              <TableCell>{u.subscription?.plan?.name ?? "Free"}</TableCell>
              <TableCell className="text-right">
                {u._count.socialAccounts}
              </TableCell>
              <TableCell className="text-right">{u._count.posts}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {u.createdAt.toLocaleDateString("ru-RU")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
