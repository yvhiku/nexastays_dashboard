import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ApiUnavailable({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <Card className="mb-4 border-nexa-warning/30 bg-nexa-warning-soft/30">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#8A5B00]" />
        <div>
          <p className="text-sm font-medium text-nexa-ink">{title}</p>
          <p className="mt-0.5 text-sm text-nexa-ink-3">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
