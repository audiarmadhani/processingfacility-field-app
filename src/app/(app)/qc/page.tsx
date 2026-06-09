"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import type { PipelineBatch, PipelineListsResponse } from "@/lib/types";
import { canAccessQc } from "@/lib/roles";
import { loadCuppingSessionCounts } from "@/lib/cupping-counts";
import {
  type CuppingSessionFilter,
  filterCuppingBatchesBySessions,
  sortPipelineByBatchNumber,
} from "@/lib/qc";
import { PipelineCard } from "@/components/qc/pipeline-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [roastBatches, setRoastBatches] = useState<PipelineBatch[]>([]);
  const [cuppingBatches, setCuppingBatches] = useState<PipelineBatch[]>([]);
  const [cuppingSessionCounts, setCuppingSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCuppingCounts, setLoadingCuppingCounts] = useState(false);
  const [search, setSearch] = useState("");
  const [cuppingSessionFilter, setCuppingSessionFilter] = useState<CuppingSessionFilter>("all");

  const allowed = canAccessQc(session?.user?.role);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<PipelineListsResponse>(apiUrl("/gb-qc/pipeline-lists"));
      const roast = res.data.roast || [];
      const cupping = res.data.readyForQc || [];
      setRoastBatches(roast);
      setCuppingBatches(cupping);

      setLoadingCuppingCounts(true);
      const counts = await loadCuppingSessionCounts(cupping.map((batch) => batch.batchNumber));
      setCuppingSessionCounts(counts);
    } catch {
      setRoastBatches([]);
      setCuppingBatches([]);
      setCuppingSessionCounts({});
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

  const filterBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items: PipelineBatch[]) => {
      if (!q) return items;
      return items.filter((batch) => {
        const haystack = [batch.batchNumber, batch.processingType, batch.experimentNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    };
  }, [search]);

  const filteredRoast = useMemo(
    () => sortPipelineByBatchNumber(filterBatches(roastBatches)),
    [filterBatches, roastBatches]
  );
  const filteredCupping = useMemo(() => {
    const sorted = sortPipelineByBatchNumber(cuppingBatches);
    const bySessions = filterCuppingBatchesBySessions(
      sorted,
      cuppingSessionFilter,
      cuppingSessionCounts
    );
    return filterBatches(bySessions);
  }, [cuppingBatches, cuppingSessionCounts, cuppingSessionFilter, filterBatches]);

  if (!allowed && status !== "loading") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">GB QC</h1>
        <p className="mt-1 text-sm text-stone-500">Roast and cupping capture</p>
      </div>

      <Input
        placeholder="Search batch, experiment…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="roast">Awaiting roast ({roastBatches.length})</TabsTrigger>
          <TabsTrigger value="cupping">Cupping ({cuppingBatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roast" className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filteredRoast.length === 0 ? (
            <p className="text-sm text-stone-500">No batches awaiting roast.</p>
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
            <p className="text-sm text-stone-500">Refreshing cupping session counts…</p>
          ) : null}

          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filteredCupping.length === 0 ? (
            <p className="text-sm text-stone-500">
              {cuppingSessionFilter === "all"
                ? "No batches ready for cupping."
                : "No batches match this cupping session filter."}
            </p>
          ) : (
            filteredCupping.map((batch) => (
              <PipelineCard
                key={`${batch.batchNumber}-${batch.processingType}`}
                batch={batch}
                mode="cupping"
                cuppingSessionCounts={cuppingSessionCounts}
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
