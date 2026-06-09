"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import type { PipelineBatch, PipelineListsResponse } from "@/lib/types";
import { canAccessQc } from "@/lib/roles";
import { PipelineCard } from "@/components/qc/pipeline-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

function QcPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "cupping" ? "cupping" : "roast";

  const [tab, setTab] = useState(initialTab);
  const [roastBatches, setRoastBatches] = useState<PipelineBatch[]>([]);
  const [cuppingBatches, setCuppingBatches] = useState<PipelineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const allowed = canAccessQc(session?.user?.role);

  const loadPipeline = useCallback(async () => {
    try {
      const res = await axios.get<PipelineListsResponse>(apiUrl("/gb-qc/pipeline-lists"));
      setRoastBatches(res.data.roast || []);
      setCuppingBatches(res.data.readyForQc || []);
    } catch {
      setRoastBatches([]);
      setCuppingBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/");
      return;
    }
    loadPipeline();
  }, [allowed, loadPipeline, router, status]);

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

  const filteredRoast = useMemo(() => filterBatches(roastBatches), [filterBatches, roastBatches]);
  const filteredCupping = useMemo(() => filterBatches(cuppingBatches), [filterBatches, cuppingBatches]);

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
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filteredCupping.length === 0 ? (
            <p className="text-sm text-stone-500">No batches ready for cupping.</p>
          ) : (
            filteredCupping.map((batch) => (
              <PipelineCard
                key={`${batch.batchNumber}-${batch.processingType}`}
                batch={batch}
                mode="cupping"
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
