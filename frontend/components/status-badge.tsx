import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_BADGE_CLASSES, APPLICATION_STATUS_LABELS } from "@/lib/domain/applications";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={APPLICATION_STATUS_BADGE_CLASSES[status] ?? "bg-neutral-100 text-neutral-600"}>
      {APPLICATION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
