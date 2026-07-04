import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  note,
}: {
  title: string;
  description?: string;
  note?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <Hammer className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            {note ?? "Этот раздел скоро появится."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
