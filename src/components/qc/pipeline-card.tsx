import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineBatch } from "@/lib/types";

type PipelineCardProps = {
  batch: PipelineBatch;
  href: string;
  mode: "roast" | "cupping";
};

export function PipelineCard({ batch, href, mode }: PipelineCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="active:scale-[0.99] transition-transform">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{batch.batchNumber}</p>
              <Badge variant="secondary">{batch.processingType}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-stone-500">
              {[batch.farmerName, batch.lotNumber].filter(Boolean).join(" · ") || "—"}
            </p>
            {mode === "cupping" && batch.cuppingCount != null ? (
              <p className="mt-1 text-xs text-stone-500">{batch.cuppingCount} cupping session(s)</p>
            ) : null}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
        </CardContent>
      </Card>
    </Link>
  );
}
