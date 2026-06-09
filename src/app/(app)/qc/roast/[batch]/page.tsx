"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { apiUrl } from "@/lib/api";
import type { RoastRecord } from "@/lib/types";
import { canAccessQc } from "@/lib/roles";
import { toDatetimeLocalValue } from "@/lib/qc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RecordRoastPageContent() {
  const params = useParams<{ batch: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const batchNumber = decodeURIComponent(params.batch);
  const processingType = searchParams.get("processingType") || "";

  const [roastHistory, setRoastHistory] = useState<RoastRecord[]>([]);
  const [roastedAt, setRoastedAt] = useState(toDatetimeLocalValue());
  const [roastProfile, setRoastProfile] = useState("");
  const [endTemp, setEndTemp] = useState("");
  const [firstCrackMinutes, setFirstCrackMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const allowed = canAccessQc(session?.user?.role);

  const loadHistory = useCallback(async () => {
    if (!batchNumber || !processingType) return;
    try {
      const res = await axios.get<RoastRecord[]>(apiUrl("/gb-qc/roasts"), {
        params: { batchNumber, processingType },
      });
      setRoastHistory(res.data || []);
    } catch {
      setRoastHistory([]);
    } finally {
      setLoading(false);
    }
  }, [batchNumber, processingType]);

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
    loadHistory();
  }, [allowed, loadHistory, processingType, router, status]);

  const canSave =
    roastedAt &&
    roastProfile.trim() !== "" &&
    endTemp !== "" &&
    !Number.isNaN(parseFloat(endTemp)) &&
    firstCrackMinutes !== "" &&
    !Number.isNaN(parseFloat(firstCrackMinutes));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await axios.post(apiUrl("/gb-qc/roast"), {
        batchNumber,
        processingType,
        roastedAt: new Date(roastedAt).toISOString(),
        roastProfile: roastProfile.trim(),
        endTemp: parseFloat(endTemp),
        firstCrackMinutes: parseFloat(firstCrackMinutes),
        notes: notes.trim() || null,
        roastedBy: session?.user?.name || session?.user?.email || "unknown",
      });
      toast.success("Roast recorded.");
      setRoastedAt(toDatetimeLocalValue());
      setRoastProfile("");
      setEndTemp("");
      setFirstCrackMinutes("");
      setNotes("");
      await loadHistory();
      router.push("/qc?tab=roast");
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? String(error.response.data.message)
          : "Failed to record roast.";
      toast.error(message);
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
          <Link href="/qc?tab=roast" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Record roast</h1>
          <p className="text-sm text-stone-500">
            {batchNumber} · {processingType}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="roastedAt">Roasted at</Label>
          <Input
            id="roastedAt"
            type="datetime-local"
            value={roastedAt}
            onChange={(e) => setRoastedAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roastProfile">Roast profile</Label>
          <Input
            id="roastProfile"
            placeholder="e.g. Medium"
            value={roastProfile}
            onChange={(e) => setRoastProfile(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="endTemp">End temp (°C)</Label>
            <Input
              id="endTemp"
              type="number"
              inputMode="decimal"
              value={endTemp}
              onChange={(e) => setEndTemp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstCrack">1st crack (min)</Label>
            <Input
              id="firstCrack"
              type="number"
              inputMode="decimal"
              value={firstCrackMinutes}
              onChange={(e) => setFirstCrackMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Roast observations…"
          />
        </div>
      </div>

      <Button className="w-full" size="lg" disabled={!canSave || saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save roast"}
      </Button>

      <div>
        <Button variant="ghost" className="w-full" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "Hide" : "Show"} roast history ({roastHistory.length})
        </Button>
        {showHistory ? (
          loading ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : roastHistory.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No roasts recorded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {roastHistory.map((row) => (
                <Card key={row.id}>
                  <CardContent className="p-4 text-sm">
                    <p className="font-semibold">
                      {row.roastProfile || "—"} · {row.endTemp ?? "—"}°C · {row.firstCrackMinutes ?? "—"} min
                    </p>
                    <p className="text-stone-500">
                      {row.roastedAt ? new Date(row.roastedAt).toLocaleString() : "—"}
                      {row.roastedBy ? ` · ${row.roastedBy}` : ""}
                    </p>
                    {row.notes ? <p className="mt-1">{row.notes}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function RecordRoastPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <RecordRoastPageContent />
    </Suspense>
  );
}
