"use client";

import { Suspense, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Webcam from "react-webcam";
import { X } from "lucide-react";
import { toast } from "sonner";
import { storeCheckInPhoto } from "@/lib/check-in-photo";
import { Button } from "@/components/ui/button";

function CheckInCameraContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const [capturing, setCapturing] = useState(false);

  const fermentationId = Number(params.id);
  const period = searchParams.get("period");

  const returnToCheckIn = () => {
    const query = period ? `?period=${period}` : "";
    router.push(`/fermentation/${fermentationId}/check-in${query}`);
  };

  const handleCapture = async () => {
    if (!Number.isFinite(fermentationId)) {
      return;
    }

    setCapturing(true);
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) {
        toast.error("Could not capture photo. Try again.");
        return;
      }

      storeCheckInPhoto(fermentationId, imageSrc);
      returnToCheckIn();
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={returnToCheckIn}
          aria-label="Close camera"
        >
          <X className="h-6 w-6" />
        </Button>
        <p className="text-sm font-medium text-white">Take tank photo</p>
        <div className="w-12" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: { ideal: "environment" },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={handleCapture}
          disabled={capturing}
          aria-label="Capture photo"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-50"
        >
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
        <p className="text-sm text-white/80">Tap shutter to capture</p>
      </div>
    </div>
  );
}

export default function CheckInCameraPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black" />}>
      <CheckInCameraContent />
    </Suspense>
  );
}
