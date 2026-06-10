"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import type { PipelineBatch, PipelineListsResponse, RoastPipelineBatch } from "@/lib/types";
import { canAccessQc } from "@/lib/roles";
import { cuppingSummariesToSessionCounts, loadCuppingSummaries } from "@/lib/cupping-counts";
import type { CuppingBatchSummary } from "@/lib/cupping-outcome";
import {
  type CuppingSessionFilter,
  type RoastPipelineFilter,
  filterCuppingBatchesBySessions,
  filterRoastPipelineBatches,
  matchesPipelineSearch,
  mergeRoastPipelineBatches,
  sortPipelineByBatchNumber,
} from "@/lib/qc";
import { BatchSearchBar } from "@/components/qc/batch-search-bar";
import { PipelineCard } from "@/components/qc/pipeline-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const ROAST_PIPELINE_FILTERS: { value: RoastPipelineFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting roast" },
  { value: "roasted", label: "Roasted" },
];

const CUPPING_SESSION_FILTERS: { value: CuppingSessionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "no_sessions", label: "No sessions" },
  { value: "has_sessions", label: "Has sessions" },
];

function QcPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "cupping" ? "cupping" : "roast";

  const [tab, setTab] = useState(tabFromUrl);
  const [roastingBatches, setRoastingBatches] = useState<RoastPipelineBatch[]>([]);
  const [cuppingBatches, setCuppingBatches] = useState<PipelineBatch[]>([]);
  const [cuppingSummaries, setCuppingSummaries] = useState<Record<string, CuppingBatchSummary>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCuppingCounts, setLoadingCuppingCounts] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roastPipelineFilter, setRoastPipelineFilter] = useState<RoastPipelineFilter>("all");
  const [cuppingSessionFilter, setCuppingSessionFilter] = useState<CuppingSessionFilter>("all");

  const allowed = canAccessQc(session?.user?.role);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<PipelineListsResponse>(apiUrl("/gb-qc/pipeline-lists"));
      const awaitingRoast = res.data.roast || [];
      const roasted = res.data.readyForQc || [];
      setRoastingBatches(mergeRoastPipelineBatches(awaitingRoast, roasted));
      setCuppingBatches(roasted);

      setLoadingCuppingCounts(true);
      const summaries = await loadCuppingSummaries(roasted.map((batch) => batch.batchNumber));
      setCuppingSummaries(summaries);
    } catch {
      setRoastingBatches([]);
      setCuppingBatches([]);
      setCuppingSummaries({});
    } finally {
      setLoading(false);
      setLoadingCuppingCounts(false);
    }
  }, []);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/");
      return;
    }
    if (pathname !== "/qc") return;
    loadPipeline();
  }, [allowed, loadPipeline, pathname, router, status]);

  const filterBySearch = useCallback(
    <T extends { batchNumber: string; processingType: string; experimentNumber?: string | number | null }>(
      items: T[]
    ) => {
      if (!appliedSearch) {
        return items;
      }
      return items.filter((batch) => matchesPipelineSearch(batch, appliedSearch));
    },
    [appliedSearch]
  );

  const filteredRoast = useMemo(() => {
    const sorted = sortPipelineByBatchNumber(roastingBatches);
    const byRoastStatus = filterRoastPipelineBatches(sorted, roastPipelineFilter);
    return filterBySearch(byRoastStatus);
  }, [filterBySearch, roastPipelineFilter, roastingBatches]);

  const cuppingSessionCounts = useMemo(
    () => cuppingSummariesToSessionCounts(cuppingSummaries),
    [cuppingSummaries]
  );

  const filteredCupping = useMemo(() => {
    const sorted = sortPipelineByBatchNumber(cuppingBatches);
    const bySessions = filterCuppingBatchesBySessions(
      sorted,
      cuppingSessionFilter,
      cuppingSessionCounts
    );
    return filterBySearch(bySessions);
  }, [cuppingBatches, cuppingSessionCounts, cuppingSessionFilter, filterBySearch]);

  if (!allowed && status !== "loading") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">GB QC</h1>
        <p className="mt-1 text-sm text-stone-500">Roast and cupping capture</p>
      </div>

      <BatchSearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={setAppliedSearch}
        placeholder="Search batch or experiment…"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="roast">Roasting ({roastingBatches.length})</TabsTrigger>
          <TabsTrigger value="cupping">Cupping ({cuppingBatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roast" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ROAST_PIPELINE_FILTERS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={roastPipelineFilter === option.value ? "default" : "outline"}
                size="default"
                onClick={() => setRoastPipelineFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filteredRoast.length === 0 ? (
            <p className="text-sm text-stone-500">
              {appliedSearch
                ? `No roasting batches match "${appliedSearch}".`
                : roastPipelineFilter === "all"
                  ? "No batches in the roasting pipeline."
                  : "No batches match this roast filter."}
            </p>
          ) : (
            filteredRoast.map((batch) => (
              <PipelineCard
                key={`${batch.batchNumber}-${batch.processingType}`}
                batch={batch}
                mode="roast"
                href={`/qc/roast/${encodeURIComponent(batch.batchNumber)}?processingType=${encodeURIComponent(batch.processingType)}`}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="cupping" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CUPPING_SESSION_FILTERS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={cuppingSessionFilter === option.value ? "default" : "outline"}
                size="default"
                onClick={() => setCuppingSessionFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {loadingCuppingCounts ? (
            <p className="text-sm text-stone-500">Refreshing cupping summaries…</p>
          ) : null}

          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filteredCupping.length === 0 ? (
            <p className="text-sm text-stone-500">
              {appliedSearch
                ? `No cupping batches match "${appliedSearch}".`
                : cuppingSessionFilter === "all"
                  ? "No batches ready for cupping."
                  : "No batches match this cupping session filter."}
            </p>
          ) : (
            filteredCupping.map((batch) => (
              <PipelineCard
                key={`${batch.batchNumber}-${batch.processingType}`}
                batch={batch}
                mode="cupping"
                cuppingSummaries={cuppingSummaries}
                href={`/qc/cupping/${encodeURIComponent(batch.batchNumber)}?processingType=${encodeURIComponent(batch.processingType)}`}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function QcPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <QcPageContent />
    </Suspense>
  );
}
