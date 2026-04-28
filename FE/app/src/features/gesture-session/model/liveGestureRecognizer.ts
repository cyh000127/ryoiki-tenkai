import {
  createLiveCameraInput,
  type NormalizedGestureInput
} from "./gestureInput";
import {
  createFrameRecognizerRuntime,
  type LiveGestureFrameRecognizer,
  type LiveGestureFrameRuntime,
  type LiveGestureLandmark,
  type LiveGestureObservation,
  type LiveGestureRuntimeSession
} from "./liveGestureRuntime";
import { createMediaPipeHandGestureRuntime } from "./mediaPipeHandRuntime";

export {
  createBrowserFrameSignalRecognizer,
  createBrowserFrameSignalRuntime,
  createFrameRecognizerRuntime,
  createNoopLiveGestureFrameRecognizer,
  createNoopLiveGestureFrameRuntime,
  type BrowserFrameSignalRecognizerOptions,
  type LiveGestureFrame,
  type LiveGestureFrameRecognizer,
  type LiveGestureFrameSignalSample,
  type LiveGestureLandmark,
  type LiveGestureFrameRuntime,
  type LiveGestureObservation,
  type LiveGestureObservationReason,
  type LiveGestureRuntimeSession,
  type LiveGestureRuntimeStartContext
} from "./liveGestureRuntime";
export {
  classifyMediaPipeHandGesture,
  createMediaPipeHandGestureRuntime,
  type ClassifiedHandGesture,
  type MediaPipeHandGestureRuntimeOptions
} from "./mediaPipeHandRuntime";

export const LIVE_GESTURE_POLL_INTERVAL_MS = 120;
export const LIVE_GESTURE_MIN_CONFIDENCE = 0.65;

export type LiveGestureRecognizerStatus =
  | "idle"
  | "starting"
  | "ready"
  | "blocked"
  | "unsupported"
  | "error"
  | "stopped";

export type LiveGestureRecognizer = {
  start: () => Promise<void>;
  stop: () => void;
};

export type CreateBrowserLiveGestureRecognizerOptions = {
  getTargetSequence: () => readonly string[];
  getExpectedToken: () => string | null;
  onObservation: (
    observation: LiveGestureObservation,
    input: NormalizedGestureInput | null
  ) => void;
  onStatusChange?: (status: LiveGestureRecognizerStatus) => void;
  runtime?: LiveGestureFrameRuntime;
  frameRecognizer?: LiveGestureFrameRecognizer;
  pollIntervalMs?: number;
  mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  createVideoElement?: () => HTMLVideoElement;
};

export function createBrowserLiveGestureRecognizer(
  options: CreateBrowserLiveGestureRecognizerOptions
): LiveGestureRecognizer {
  const runtime =
    options.runtime ??
    (options.frameRecognizer
      ? createFrameRecognizerRuntime(options.frameRecognizer)
      : createMediaPipeHandGestureRuntime());
  const pollIntervalMs = options.pollIntervalMs ?? LIVE_GESTURE_POLL_INTERVAL_MS;
  const mediaDevices = options.mediaDevices ?? getBrowserMediaDevices();
  const createVideoElement =
    options.createVideoElement ?? (() => document.createElement("video"));

  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let runtimeSession: LiveGestureRuntimeSession | null = null;
  let intervalId: number | null = null;
  let status: LiveGestureRecognizerStatus = "idle";
  let lastObservationFingerprint: string | null = null;
  let lifecycleVersion = 0;

  function setStatus(nextStatus: LiveGestureRecognizerStatus) {
    if (status === nextStatus) {
      return;
    }

    status = nextStatus;
    options.onStatusChange?.(nextStatus);
  }

  function observeFrame() {
    if (!video) {
      return;
    }

    if (!runtimeSession) {
      return;
    }

    const observation = runtimeSession.recognizeFrame({
      video,
      targetSequence: options.getTargetSequence(),
      expectedToken: options.getExpectedToken(),
      atMs: Date.now()
    });

    if (!observation) {
      return;
    }

    const fingerprint = getObservationFingerprint(observation);
    if (fingerprint === lastObservationFingerprint) {
      return;
    }

    lastObservationFingerprint = fingerprint;
    options.onObservation(observation, toNormalizedInput(observation));
  }

  function cleanup() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (runtimeSession) {
      runtimeSession.stop?.();
      runtimeSession = null;
    }

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      stream = null;
    }

    if (video) {
      video.srcObject = null;
      video = null;
    }

    lastObservationFingerprint = null;
  }

  function stopStream(targetStream: MediaStream) {
    for (const track of targetStream.getTracks()) {
      track.stop();
    }
  }

  function isCurrentStart(version: number): boolean {
    return lifecycleVersion === version && status === "starting";
  }

  return {
    async start() {
      if (status === "starting" || status === "ready") {
        return;
      }

      if (!mediaDevices?.getUserMedia || typeof document === "undefined") {
        setStatus("unsupported");
        return;
      }

      const startVersion = lifecycleVersion + 1;
      lifecycleVersion = startVersion;
      setStatus("starting");

      try {
        const nextStream = await mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user"
          }
        });

        if (!isCurrentStart(startVersion)) {
          stopStream(nextStream);
          return;
        }

        const nextVideo = createVideoElement();
        nextVideo.muted = true;
        nextVideo.playsInline = true;
        nextVideo.srcObject = nextStream;
        stream = nextStream;
        video = nextVideo;

        if (typeof nextVideo.play === "function") {
          await nextVideo.play();
        }

        const nextRuntimeSession = await runtime.start({
          video: nextVideo
        });

        if (!isCurrentStart(startVersion)) {
          nextRuntimeSession.stop?.();
          cleanup();
          return;
        }

        runtimeSession = nextRuntimeSession;
        setStatus("ready");
        observeFrame();
        intervalId = window.setInterval(observeFrame, pollIntervalMs);
      } catch (error) {
        if (!isCurrentStart(startVersion)) {
          return;
        }
        cleanup();
        setStatus(getCameraErrorStatus(error));
      }
    },
    stop() {
      lifecycleVersion += 1;
      cleanup();
      setStatus("stopped");
    }
  };
}

function toNormalizedInput(
  observation: LiveGestureObservation
): NormalizedGestureInput | null {
  if (
    observation.reason !== "recognized" ||
    !observation.handDetected ||
    observation.token === null ||
    observation.confidence < LIVE_GESTURE_MIN_CONFIDENCE
  ) {
    return null;
  }

  return createLiveCameraInput(observation.token, observation.confidence);
}
function getObservationFingerprint(observation: LiveGestureObservation): string {
  const confidenceBucket = Math.round(observation.confidence * 100);
  const stabilityBucket = Math.floor(observation.stabilityMs / 250);
  const meshBucket = getHandMeshFingerprint(observation.handLandmarks);

  return [
    observation.reason,
    observation.token ?? "",
    observation.handDetected ? "1" : "0",
    confidenceBucket,
    stabilityBucket,
    meshBucket
  ].join(":");
}

function getHandMeshFingerprint(
  handLandmarks: LiveGestureLandmark[][] | undefined
): string {
  const firstHand = handLandmarks?.[0];
  if (!firstHand) {
    return "";
  }

  const wrist = firstHand[0];
  const indexTip = firstHand[8];
  const pinkyTip = firstHand[20];

  return [wrist, indexTip, pinkyTip]
    .filter(Boolean)
    .map((landmark) =>
      `${Math.round(landmark.x * 32)}.${Math.round(landmark.y * 32)}`
    )
    .join("|");
}

function getBrowserMediaDevices(): Pick<MediaDevices, "getUserMedia"> | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return navigator.mediaDevices;
}

function getCameraErrorStatus(error: unknown): LiveGestureRecognizerStatus {
  const errorName = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name)
    : "";

  return errorName === "NotAllowedError" || errorName === "SecurityError"
    ? "blocked"
    : "error";
}
