"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/fetch-api";
import { apiUrl } from "@/lib/api";
import axios from "axios";
import type { PendingCheckInsResponse, PipelineListsResponse } from "@/lib/types";
import { canAccessFermentation, canAccessQc } from "@/lib/roles";
import { periodLabel } from "@/lib/qc";
import { BatchCard } from "@/components/fermentation/batch-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const showFermentation = canAccessFermentation(role);
  const showQc = canAccessQc(role);

  const [pendingData, setPendingData] = useState<PendingCheckInsResponse | null>(null);
  const [qcCounts, setQcCounts] = useState({ roast: 0, cupping: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (sessionStatus !== "authenticated") {
      return;
    }
    try {
      setApiError(null);
      const requests: Promise<void>[] = [];

      if (showFermentation) {
        requests.push(
          axios.get<PendingCheckInsResponse>(apiUrl("/fermentation/check-ins/pending")).then((res) => {
            setPendingData(res.data);
          })
        );
      }

      if (showQc) {
        requests.push(
          axios.get<PipelineListsResponse>(apiUrl("/gb-qc/pipeline-lists")).then((res) => {
            setQcCounts({
              roast: (res.data.roast?.length || 0) + (res.data.readyForQc?.length || 0),
              cupping: res.data.readyForQc?.length || 0,
            });
          })
        );
      }

      await Promise.all(requests);
    } catch (error) {
      setPendingData(null);
      const message = getApiErrorMessage(error, "Failed to load data from the platform API.");
      setApiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionStatus, showFermentation, showQc]);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }
    if (sessionStatus === "unauthenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadData();
  }, [loadData, sessionStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const name = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Hi, {name}</h1>
          <p className="mt-1 text-sm text-stone-500">BTM Field — daily capture</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {showFermentation ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Fermentation check-ins</h2>
            {pendingData ? (
              <Badge variant={pendingData.inReminderWindow ? "default" : "secondary"}>
                {periodLabel(pendingData.activePeriod)}
              </Badge>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {(pendingData?.overdue?.length || 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">Overdue</p>
                  {pendingData?.overdue.map((batch) => (
                    <BatchCard
                      key={`overdue-${batch.id}-${batch.missingPeriod}`}
                      batch={batch}
                      href={`/fermentation/${batch.id}/check-in?period=${batch.missingPeriod || "morning"}`}
                      overdue
                    />
                  ))}
                </div>
              ) : null}

              {(pendingData?.pending?.length || 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-700">Due now</p>
                  {pendingData?.pending.map((batch) => (
                    <BatchCard
                      key={`pending-${batch.id}-${batch.missingPeriod}`}
                      batch={batch}
                      href={`/fermentation/${batch.id}/check-in?period=${batch.missingPeriod || pendingData?.activePeriod || "morning"}`}
                    />
                  ))}
                </div>
              ) : null}

              {!pendingData?.pending?.length && !pendingData?.overdue?.length ? (
                <Card>
                  <CardContent className="p-4 text-sm text-stone-500">
                    No pending check-ins right now.
                    {!pendingData?.inReminderWindow
                      ? " Morning window is 06:00–12:00 WITA; evening is 17:00–21:00 WITA."
                      : ""}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {showQc ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">GB QC queues</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/qc?tab=roast">
              <Card className="h-full active:scale-[0.99] transition-transform">
                <CardContent className="flex h-full flex-col justify-between p-4">
                  <p className="text-sm text-stone-500">Roasting</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-800">{qcCounts.roast}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/qc?tab=cupping">
              <Card className="h-full active:scale-[0.99] transition-transform">
                <CardContent className="flex h-full flex-col justify-between p-4">
                  <p className="text-sm text-stone-500">Ready for cupping</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-800">{qcCounts.cupping}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      ) : null}

      {apiError ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            <p className="font-semibold">Could not load data</p>
            <p className="mt-1">{apiError}</p>
            <p className="mt-2 text-xs text-amber-800">
              This app reads data through the platform API (Render), which uses your Supabase Postgres
              database. It does not connect to Supabase directly.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {sessionStatus === "authenticated" && !showFermentation && !showQc ? (
        <Card>
          <CardContent className="p-4 text-sm text-stone-500">
            Your account does not have access to field workflows. Contact an administrator.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
