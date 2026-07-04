import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreatePromoForm } from "@/components/admin/create-promo-form";
import { PromoToggle } from "@/components/admin/promo-toggle";

export const metadata: Metadata = { title: "Промокоды · Админка" };

export default async function AdminPromosPage() {
  const promos = await prisma.promoCode.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Создать промокод</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePromoForm />
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="text-right">Активаций</TableHead>
              <TableHead className="text-right">Активен</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.code}</TableCell>
                <TableCell>
                  {p.grantsUnlimited ? (
                    <Badge variant="secondary">Безлимит</Badge>
                  ) : p.percentOff ? (
                    <span>−{p.percentOff}%</span>
                  ) : (
                    <span className="text-muted-foreground">{p.type}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {p._count.redemptions}
                  {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  <PromoToggle id={p.id} active={p.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
