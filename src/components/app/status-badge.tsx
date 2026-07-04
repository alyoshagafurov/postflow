import { PublicationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<
  PublicationStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Ожидает", className: "bg-muted text-muted-foreground" },
  QUEUED: { label: "В очереди", className: "bg-primary/15 text-primary" },
  PROCESSING: { label: "Публикуется", className: "bg-warning/15 text-warning" },
  PUBLISHED: { label: "Опубликовано", className: "bg-success/15 text-success" },
  FAILED: { label: "Ошибка", className: "bg-destructive/15 text-destructive" },
  CANCELED: { label: "Отменено", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: PublicationStatus }) {
  const s = STATUS_MAP[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", s.className)}>
      {s.label}
    </Badge>
  );
}
