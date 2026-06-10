"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { CuppingEntry, CuppingOutcome } from "@/lib/types";
import { canAccessQc } from "@/lib/roles";
import {
  buildCuppingOnlyPayload,
  emptyCuppingDraft,
  isCuppingEntryComplete,
  mapCuppingEntry,
} from "@/lib/qc";
import { CUPPING_OUTCOMES, getCuppingOutcomeMeta, summarizeCuppingOutcomes } from "@/lib/cupping-outcome";
import { loadQcBatchContext, type QcBatchContext } from "@/lib/qc-batch-context";
import { BatchContextCard } from "@/components/qc/batch-context-card";
import { CuppingOutcomePills } from "@/components/qc/cupping-outcome-pills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CuppingDraft = ReturnType<typeof emptyCuppingDraft>;

function CuppingPageContent() {
  const params = useParams<{ batch: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const batchNumber = decodeURIComponent(params.batch);
  const processingType = searchParams.get("processingType") || "";

  const [entries, setEntries] = useState<CuppingEntry[]>([]);
  const [batchContext, setBatchContext] = useState<QcBatchContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [draft, setDraft] = useState<CuppingDraft>(emptyCuppingDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const allowed = canAccessQc(session?.user?.role);
  const outcomeSummary = useMemo(() => summarizeCuppingOutcomes(entries), [entries]);

  const loadEntries = useCallback(async () => {
    try {
      const res = await axios.get(apiUrl(`/gb-qc/cupping/${encodeURIComponent(batchNumber)}`));
      setEntries((res.data || []).map(mapCuppingEntry));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [batchNumber]);

  const loadBatchContext = useCallback(async () => {
    if (!batchNumber) return;
    setLoadingContext(true);
    try {
      setBatchContext(await loadQcBatchContext(batchNumber));
    } catch {
      setBatchContext(null);
    } finally {
      setLoadingContext(false);
    }
  }, [batchNumber]);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/");
      return;
    }
    if (!processingType) {
      toast.error("Missing processing type.");
      router.replace("/qc");
      return;
    }
    loadEntries();
    loadBatchContext();
  }, [allowed, loadBatchContext, loadEntries, processingType, router, status]);

  const resetDraft = () => {
    setDraft(emptyCuppingDraft());
    setShowForm(false);
  };

  const handleAddOrUpdate = () => {
    if (!isCuppingEntryComplete(draft)) {
      toast.error("Complete date, notes, and outcome before adding.");
      return;
    }

    const updatedEntry: CuppingEntry = {
      id: draft.editingIndex != null ? entries[draft.editingIndex]?.id : null,
      cuppedAt: draft.cuppedAt,
      notes: draft.notes.trim(),
      cuppingOutcome: draft.cuppingOutcome as CuppingOutcome,
      cuppedBy: session?.user?.name || session?.user?.email || null,
    };

    if (draft.editingIndex != null) {
      setEntries((prev) =>
        prev.map((entry, index) => (index === draft.editingIndex ? { ...entry, ...updatedEntry } : entry))
      );
    } else {
      setEntries((prev) => [...prev, updatedEntry]);
    }
    resetDraft();
  };

  const handleEdit = (index: number) => {
    const entry = entries[index];
    if (!entry) return;
    setDraft({
      cuppedAt: entry.cuppedAt,
      notes: entry.notes,
      cuppingOutcome: entry.cuppingOutcome,
      editingIndex: index,
    });
    setShowForm(true);
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    if (draft.editingIndex === index) {
      resetDraft();
    }
  };

  const handleSave = async () => {
    if (!entries.length || !entries.every(isCuppingEntryComplete)) {
      toast.error("Add at least one complete cupping session before saving.");
      return;
    }

    setSaving(true);
    try {
      await axios.post(apiUrl("/postproqc"), {
        batchNumber,
        ...buildCuppingOnlyPayload(
          entries,
          session?.user?.name || session?.user?.email || "unknown",
          false
        ),
      });
      toast.success("Cupping saved.");
      router.push("/qc?tab=cupping");
      router.refresh();
    } catch {
      toast.error("Failed to save cupping.");
    } finally {
      setSaving(false);
    }
  };

  if (!allowed && status !== "loading") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/qc?tab=cupping" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Cupping</h1>
          <p className="text-sm text-stone-500">
            {batchNumber} · {processingType}
          </p>
          {!loading && outcomeSummary.length > 0 ? (
            <CuppingOutcomePills summary={outcomeSummary} className="mt-2" />
          ) : null}
        </div>
      </div>

      <BatchContextCard context={batchContext} loading={loadingContext} />

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-stone-500">No cupping sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const outcomeMeta = getCuppingOutcomeMeta(entry.cuppingOutcome);
            return (
              <Card key={`${entry.id ?? "new"}-${index}`}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{entry.cuppedAt}</p>
                      {outcomeMeta ? (
                        <Badge className={outcomeMeta.badgeClass}>{outcomeMeta.label}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{entry.notes}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(index)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <p className="font-semibold">{draft.editingIndex != null ? "Edit session" : "New session"}</p>
            <div className="space-y-2">
              <Label htmlFor="cuppedAt">Date cupped</Label>
              <Input
                id="cuppedAt"
                type="date"
                value={draft.cuppedAt}
                onChange={(e) => setDraft((prev) => ({ ...prev, cuppedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuppingNotes">Notes</Label>
              <Textarea
                id="cuppingNotes"
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Aroma, flavor, body, acidity, defects…"
              />
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <div className="grid grid-cols-2 gap-2">
                {CUPPING_OUTCOMES.map((outcome) => (
                  <Button
                    key={outcome.value}
                    type="button"
                    size="lg"
                    className={cn(
                      draft.cuppingOutcome === outcome.value
                        ? outcome.selectedButtonClass
                        : outcome.buttonClass
                    )}
                    variant={draft.cuppingOutcome === outcome.value ? "default" : "outline"}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, cuppingOutcome: outcome.value }))
                    }
                  >
                    {outcome.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={resetDraft}>
                Cancel
              </Button>
              <Button onClick={handleAddOrUpdate}>
                {draft.editingIndex != null ? "Update" : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button className="w-full" variant="outline" size="lg" onClick={() => setShowForm(true)}>
          Add cupping session
        </Button>
      )}

      <Button className="w-full" size="lg" disabled={saving || entries.length === 0} onClick={handleSave}>
        {saving ? "Saving…" : "Save cupping"}
      </Button>
    </div>
  );
}

export default function CuppingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <CuppingPageContent />
    </Suspense>
  );
}
