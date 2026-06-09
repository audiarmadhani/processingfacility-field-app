declare module "react-webcam" {
  import * as React from "react";

  export interface WebcamProps extends React.HTMLAttributes<HTMLVideoElement> {
    audio?: boolean;
    screenshotFormat?: "image/webp" | "image/png" | "image/jpeg";
    screenshotQuality?: number;
    videoConstraints?: MediaTrackConstraints;
    onUserMedia?: (stream: MediaStream) => void;
    onUserMediaError?: (error: string | DOMException) => void;
  }

  export default class Webcam extends React.Component<WebcamProps> {
    getScreenshot(): string | null;
  }
}
