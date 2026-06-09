"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "sonner";
import { ArrowLeft, Camera, ImagePlus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import type { CheckInRecord, FermentationBatch } from "@/lib/types";
import { canAccessFermentation } from "@/lib/roles";
import { loadStoredCheckInPhoto } from "@/lib/check-in-photo";
import {
  formatEstimatedFinish,
  formatLastCheckIn,
  getLastCheckIn,
} from "@/lib/fermentation-datetime";
import { formatTankLabel, periodLabel } from "@/lib/qc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CheckInPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const fermentationId = Number(params.id);
  const periodParam = searchParams.get("period") as "morning" | "evening" | null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batch, setBatch] = useState<FermentationBatch | null>(null);
  const [activePeriod, setActivePeriod] = useState<"morning" | "evening" | null>(periodParam);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allowed = canAccessFermentation(session?.user?.role);

  const checkInQuery = periodParam ? `?period=${periodParam}` : "";
  const cameraHref = `/fermentation/${fermentationId}/check-in/camera${checkInQuery}`;

  const applyCapturedPhoto = useCallback(async () => {
    if (!Number.isFinite(fermentationId)) {
      return;
    }

    const captured = await loadStoredCheckInPhoto(fermentationId);
    if (!captured) {
      return;
    }

    setSelectedFile(captured.file);
    setPreviewUrl(captured.previewUrl);
  }, [fermentationId]);

  const loadData = useCallback(async () => {
    try {
      const [detailsRes, checkInsRes, pendingRes] = await Promise.all([
        axios.get<FermentationBatch[]>(apiUrl(`/fermentation/details/id/${fermentationId}`)),
        axios.get<CheckInRecord[]>(apiUrl(`/fermentation/${fermentationId}/check-ins`)),
        axios.get(apiUrl("/fermentation/check-ins/pending")),
      ]);

      setBatch(detailsRes.data?.[0] || null);

      setCheckIns(checkInsRes.data || []);

      if (!periodParam) {
        const dueForRow = [...(pendingRes.data?.pending || []), ...(pendingRes.data?.overdue || [])].find(
          (item: FermentationBatch) => item.id === fermentationId
        );
        setActivePeriod(
          dueForRow?.missingPeriod || pendingRes.data?.activePeriod || null
        );
      }
    } catch {
      toast.error("Failed to load batch details.");
    } finally {
      setLoading(false);
    }
  }, [fermentationId, periodParam]);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/");
      return;
    }
    if (!Number.isFinite(fermentationId)) {
      router.replace("/fermentation");
      return;
    }
    loadData();
  }, [allowed, fermentationId, loadData, router, status]);

  useEffect(() => {
    void applyCapturedPhoto();
  }, [applyCapturedPhoto]);

  useEffect(() => {
    const handleFocus = () => {
      void applyCapturedPhoto();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [applyCapturedPhoto]);

  const clearPhoto = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    clearPhoto();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitCheckIn = async () => {
    if (!selectedFile) {
      toast.error("Add a tank photo before submitting.");
      return;
    }

    if (!batch?.id || !session?.user?.name) {
      toast.error("Missing session or batch data.");
      return;
    }

    if (!activePeriod) {
      toast.error(
        "Check-in is only available during morning (06:00–12:00 WITA) or evening (17:00–21:00 WITA)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("batchNumber", batch.batchNumber || "");
      formData.append("module", "Fermentation-CheckIn");

      const uploadRes = await axios.post(apiUrl("/upload-image"), formData);
      const imageUrl = uploadRes.data?.url;
      if (!imageUrl) {
        throw new Error("Upload did not return an image URL");
      }

      await axios.post(apiUrl(`/fermentation/${batch.id}/check-in`), {
        notes,
        imageUrl,
        period: activePeriod,
        createdBy: session.user.name,
      });

      toast.success(
        `${activePeriod === "morning" ? "Morning" : "Evening"} check-in saved for ${batch.batchNumber}.`
      );
      router.push("/");
      router.refresh();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : "Failed to save check-in.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed && status !== "loading") {
    return null;
  }

  const hasPhoto = Boolean(selectedFile && previewUrl);
  const today = dayjs().format("YYYY-MM-DD");
  const todayCheckIns = checkIns.filter(
    (item) => item.checkInDate === today || item.checkInDate?.slice?.(0, 10) === today
  );
  const lastCheckIn = getLastCheckIn(checkIns);
  const estimatedFinish = formatEstimatedFinish(batch);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/fermentation" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Check in</h1>
          <p className="text-sm text-stone-500">{batch?.batchNumber || "Loading…"}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{periodLabel(activePeriod)}</Badge>
            <span className="text-sm text-stone-500">Tank {formatTankLabel(batch || {})}</span>
          </div>

          <Card>
            <CardContent className="grid gap-3 p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-stone-500">Est. finish</span>
                <span className="text-right font-medium text-stone-900">{estimatedFinish}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-stone-500">Last check-in</span>
                <span className="text-right font-medium text-stone-900">
                  {formatLastCheckIn(lastCheckIn)}
                </span>
              </div>
            </CardContent>
          </Card>

          {todayCheckIns.length > 0 ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-semibold">Today&apos;s check-ins</p>
                {todayCheckIns.map((item) => (
                  <p key={item.id} className="text-sm text-stone-600">
                    {item.period === "morning" ? "Morning" : "Evening"} — {item.createdBy || "Unknown"}
                    {item.notes ? `: ${item.notes}` : ""}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Observations about the tank…"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-700">Tank photo (required)</p>

            {hasPhoto ? (
              <Card>
                <CardContent className="space-y-3 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl!}
                    alt="Captured tank"
                    className="max-h-80 w-full rounded-xl object-contain"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="lg" asChild>
                      <Link href={cameraHref}>
                        <RotateCcw className="mr-2 h-5 w-5" />
                        Retake
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <ImagePlus className="mr-2 h-5 w-5" />
                      Replace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <Button type="button" className="w-full" size="lg" asChild>
                  <Link href={cameraHref}>
                    <Camera className="mr-2 h-5 w-5" />
                    Open camera
                  </Link>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <ImagePlus className="mr-2 h-5 w-5" />
                  Upload from gallery
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="sticky bottom-24">
        <Button
          className="w-full"
          size="lg"
          disabled={submitting || loading || !hasPhoto || !activePeriod}
          onClick={submitCheckIn}
        >
          {submitting ? "Saving…" : "Submit check-in"}
        </Button>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <CheckInPageContent />
    </Suspense>
  );
}
