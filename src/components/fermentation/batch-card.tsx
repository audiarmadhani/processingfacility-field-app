import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FermentationBatch } from "@/lib/types";
import { formatTankLabel } from "@/lib/qc";

type BatchCardProps = {
  batch: FermentationBatch;
  href: string;
  overdue?: boolean;
};

export function BatchCard({ batch, href, overdue }: BatchCardProps) {
  return (
    <Link href={href} className="block">
      <Card className={overdue ? "border-red-300 bg-red-50" : "active:scale-[0.99] transition-transform"}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{batch.batchNumber || "TBD"}</p>
              {batch.missingPeriod ? (
                <Badge variant={overdue ? "destructive" : "warning"}>
                  {batch.missingPeriod === "evening" ? "Evening" : "Morning"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-stone-500">
              Tank {formatTankLabel(batch)}
              {batch.experimentNumber ? ` · Exp ${batch.experimentNumber}` : ""}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
        </CardContent>
      </Card>
    </Link>
  );
}
