"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Webcam from "react-webcam";
import axios from "axios";
import dayjs from "dayjs";
import { toast } from "sonner";
import { ArrowLeft, Camera, ImagePlus } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import type { CheckInRecord, FermentationBatch } from "@/lib/types";
import { canAccessFermentation } from "@/lib/roles";
import { formatTankLabel, periodLabel } from "@/lib/qc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CheckInPageContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const fermentationId = Number(params.id);
  const periodParam = searchParams.get("period") as "morning" | "evening" | null;

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batch, setBatch] = useState<FermentationBatch | null>(null);
  const [activePeriod, setActivePeriod] = useState<"morning" | "evening" | null>(periodParam);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInRecord[]>([]);
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allowed = canAccessFermentation(session?.user?.role);

  const loadData = useCallback(async () => {
    try {
      const [detailsRes, checkInsRes, pendingRes] = await Promise.all([
        axios.get<FermentationBatch[]>(apiUrl(`/fermentation/details/id/${fermentationId}`)),
        axios.get<CheckInRecord[]>(apiUrl(`/fermentation/${fermentationId}/check-ins`)),
        axios.get(apiUrl("/fermentation/check-ins/pending")),
      ]);

      setBatch(detailsRes.data?.[0] || null);

      const today = dayjs().format("YYYY-MM-DD");
      setTodayCheckIns(
        (checkInsRes.data || []).filter(
          (item) =>
            item.checkInDate === today || item.checkInDate?.slice?.(0, 10) === today
        )
      );

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitCheckIn = async (imageFile: File) => {
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
      formData.append("file", imageFile);
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

  const handleSubmitCamera = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Could not capture photo. Try again or upload from gallery.");
      return;
    }
    const blob = await fetch(imageSrc).then((res) => res.blob());
    const file = new File([blob], `checkin_${Date.now()}.jpg`, { type: "image/jpeg" });
    await submitCheckIn(file);
  };

  const handleSubmitFile = async () => {
    if (!selectedFile) return;
    await submitCheckIn(selectedFile);
  };

  if (!allowed && status !== "loading") {
    return null;
  }

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

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="camera">
                <Camera className="mr-1 h-4 w-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="upload">
                <ImagePlus className="mr-1 h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera">
              <Card>
                <CardContent className="overflow-hidden rounded-xl p-0">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 1280,
                      height: 720,
                      facingMode: { ideal: "environment" },
                    }}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload">
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
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                Choose image
              </Button>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="mt-3 max-h-80 w-full rounded-xl object-contain" />
              ) : (
                <p className="mt-3 text-sm text-stone-500">Select a JPEG or PNG photo of the tank.</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="sticky bottom-24">
        {tab === "camera" ? (
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || loading || !activePeriod}
            onClick={handleSubmitCamera}
          >
            {submitting ? "Saving…" : "Submit check-in"}
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || loading || !selectedFile || !activePeriod}
            onClick={handleSubmitFile}
          >
            {submitting ? "Saving…" : "Submit check-in"}
          </Button>
        )}
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
