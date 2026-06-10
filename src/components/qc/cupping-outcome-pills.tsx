import { Badge } from "@/components/ui/badge";
import {
  type CuppingOutcomeCount,
  getCuppingOutcomeMeta,
} from "@/lib/cupping-outcome";

type CuppingOutcomePillsProps = {
  summary: CuppingOutcomeCount[];
  className?: string;
};

export function CuppingOutcomePills({ summary, className }: CuppingOutcomePillsProps) {
  if (!summary.length) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {summary.map((item) => {
        const meta = getCuppingOutcomeMeta(item.value);
        if (!meta) return null;

        return (
          <Badge key={item.value} className={meta.badgeClass}>
            {meta.label} ({item.count})
          </Badge>
        );
      })}
    </div>
  );
}
