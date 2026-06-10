import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineBatch, RoastPipelineBatch } from "@/lib/types";
import { type CuppingBatchSummary, summarizeCuppingBatchSummary } from "@/lib/cupping-outcome";
import { normalizeCuppingCount, normalizeRoastCount } from "@/lib/qc";
import { CuppingOutcomePills } from "@/components/qc/cupping-outcome-pills";

type PipelineCardProps = {
  batch: PipelineBatch | RoastPipelineBatch;
  href: string;
  mode: "roast" | "cupping";
  cuppingSummaries?: Record<string, CuppingBatchSummary>;
};

export function PipelineCard({ batch, href, mode, cuppingSummaries = {} }: PipelineCardProps) {
  const cuppingSummary = cuppingSummaries[batch.batchNumber];
  const cuppingCount =
    mode === "cupping"
      ? cuppingSummary !== undefined
        ? normalizeCuppingCount(cuppingSummary.total)
        : normalizeCuppingCount(batch.cuppingCount)
      : 0;
  const outcomeSummary =
    mode === "cupping" ? summarizeCuppingBatchSummary(cuppingSummary) : [];
  const roastBatch = batch as RoastPipelineBatch;
  const roastCount = normalizeRoastCount(batch.roastCount);
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
              {batch.experimentNumber ? `Exp ${batch.experimentNumber}` : "—"}
            </p>
            {mode === "roast" ? (
              <p className="mt-1 text-xs text-stone-500">
                {roastBatch.roastPipelineStatus === "roasted"
                  ? `${roastCount} roast${roastCount === 1 ? "" : "s"} recorded`
                  : "Awaiting roast"}
              </p>
            ) : null}
            {mode === "cupping" && outcomeSummary.length > 0 ? (
              <CuppingOutcomePills summary={outcomeSummary} className="mt-2" />
            ) : null}
            {mode === "cupping" && cuppingCount === 0 ? (
              <p className="mt-1 text-xs text-stone-500">No cupping sessions</p>
            ) : null}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
        </CardContent>
      </Card>
    </Link>
  );
}
