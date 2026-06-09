"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import type { FermentationBatch } from "@/lib/types";
import { canAccessFermentation } from "@/lib/roles";
import { BatchCard } from "@/components/fermentation/batch-card";
import { BatchSearchBar } from "@/components/qc/batch-search-bar";
import { matchesPipelineSearch } from "@/lib/qc";
import { Skeleton } from "@/components/ui/skeleton";

export default function FermentationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<FermentationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const allowed = canAccessFermentation(session?.user?.role);

  const loadBatches = useCallback(async () => {
    try {
      const [fermentationRes, pendingRes] = await Promise.all([
        axios.get<FermentationBatch[]>(apiUrl("/fermentation")),
        axios.get(apiUrl("/fermentation/check-ins/pending")),
      ]);

      const inProgress = (fermentationRes.data || []).filter(
        (row) => row.status === "In Progress" && row.batchNumber
      );

      const periodMap = new Map<number, "morning" | "evening">();
      for (const row of [...(pendingRes.data?.pending || []), ...(pendingRes.data?.overdue || [])]) {
        if (row.id && row.missingPeriod) {
          periodMap.set(row.id, row.missingPeriod);
        }
      }

      setBatches(
        inProgress.map((row) => ({
          ...row,
          missingPeriod: periodMap.get(row.id),
        }))
      );
    } catch {
      setBatches([]);
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
    loadBatches();
  }, [allowed, loadBatches, router, status]);

  const filtered = useMemo(() => {
    if (!appliedSearch) {
      return batches;
    }
    return batches.filter((batch) => {
      if (!batch.batchNumber) {
        return false;
      }
      return (
        matchesPipelineSearch(
          {
            batchNumber: batch.batchNumber,
            experimentNumber: batch.experimentNumber,
          },
          appliedSearch
        ) ||
        [batch.referenceNumber, batch.tank, ...(batch.tanks || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(appliedSearch.toLowerCase())
      );
    });
  }, [appliedSearch, batches]);

  if (!allowed && status !== "loading") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Fermentation</h1>
        <p className="mt-1 text-sm text-stone-500">In-progress batches</p>
      </div>

      <BatchSearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={setAppliedSearch}
        placeholder="Search batch or experiment…"
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-500">
          {appliedSearch
            ? `No batches match "${appliedSearch}".`
            : "No in-progress batches found."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              href={`/fermentation/${batch.id}/check-in${batch.missingPeriod ? `?period=${batch.missingPeriod}` : ""}`}
              overdue={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
