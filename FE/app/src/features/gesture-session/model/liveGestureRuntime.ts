export type LiveGestureObservationReason =
  | "camera_ready"
  | "no_hand"
  | "unstable"
  | "recognized"
  | "permission_denied"
  | "unsupported"
  | "camera_error";

export type LiveGestureObservation = {
  token: string | null;
  confidence: number;
  handDetected: boolean;
  stabilityMs: number;
  reason: LiveGestureObservationReason;
};

export type LiveGestureFrame = {
  video: HTMLVideoElement;
  targetSequence: readonly string[];
  expectedToken: string | null;
  atMs: number;
};

export type LiveGestureFrameRecognizer = (
  frame: LiveGestureFrame
) => LiveGestureObservation | null;

export type LiveGestureRuntimeStartContext = {
  video: HTMLVideoElement;
};

export type LiveGestureRuntimeSession = {
  recognizeFrame: LiveGestureFrameRecognizer;
  stop?: () => void;
};

export type LiveGestureFrameRuntime = {
  start: (
    context: LiveGestureRuntimeStartContext
  ) => LiveGestureRuntimeSession | Promise<LiveGestureRuntimeSession>;
};

export type LiveGestureFrameSignalSample = {
  hasFrame: boolean;
  signalScore: number;
};

export type BrowserFrameSignalRecognizerOptions = {
  minSignalScore?: number;
  minRecognitionConfidence?: number;
  recognitionStableMs?: number;
  sampleFrame?: (video: HTMLVideoElement) => LiveGestureFrameSignalSample | null;
};

const FRAME_SIGNAL_SAMPLE_WIDTH = 24;
const FRAME_SIGNAL_SAMPLE_HEIGHT = 18;
const DEFAULT_MIN_SIGNAL_SCORE = 0.08;
const DEFAULT_MIN_RECOGNITION_CONFIDENCE = 0.65;
const DEFAULT_RECOGNITION_STABLE_MS = 500;

export function createFrameRecognizerRuntime(
  frameRecognizer: LiveGestureFrameRecognizer
): LiveGestureFrameRuntime {
  return {
    start: () => ({
      recognizeFrame: frameRecognizer
    })
  };
}

export function createBrowserFrameSignalRecognizer(
  options: BrowserFrameSignalRecognizerOptions = {}
): LiveGestureFrameRecognizer {
  const sampleFrame = options.sampleFrame ?? createDefaultFrameSignalSampler();
  const minSignalScore = options.minSignalScore ?? DEFAULT_MIN_SIGNAL_SCORE;
  const minRecognitionConfidence =
    options.minRecognitionConfidence ?? DEFAULT_MIN_RECOGNITION_CONFIDENCE;
  const recognitionStableMs =
    options.recognitionStableMs ?? DEFAULT_RECOGNITION_STABLE_MS;

  let stableToken: string | null = null;
  let stableSinceMs: number | null = null;

  function resetStability() {
    stableToken = null;
    stableSinceMs = null;
  }

  return ({ video, targetSequence, expectedToken, atMs }) => {
    if (!expectedToken || !targetSequence.includes(expectedToken)) {
      resetStability();

      return {
        token: null,
        confidence: 0,
        handDetected: false,
        stabilityMs: 0,
        reason: "camera_ready"
      };
    }

    const sample = sampleFrame(video);
    const signalScore = clamp01(sample?.signalScore ?? 0);

    if (!sample?.hasFrame || signalScore < minSignalScore) {
      resetStability();

      return {
        token: null,
        confidence: signalScore,
        handDetected: false,
        stabilityMs: 0,
        reason: "no_hand"
      };
    }

    if (stableToken !== expectedToken || stableSinceMs === null) {
      stableToken = expectedToken;
      stableSinceMs = atMs;
    }

    const stabilityMs = Math.max(0, atMs - stableSinceMs);
    const stableProgress =
      recognitionStableMs <= 0 ? 1 : Math.min(1, stabilityMs / recognitionStableMs);
    const confidence = clamp(
      0.45 + signalScore * 0.35 + stableProgress * 0.25,
      0,
      0.98
    );

    if (
      stabilityMs >= recognitionStableMs &&
      confidence >= minRecognitionConfidence
    ) {
      return {
        token: expectedToken,
        confidence,
        handDetected: true,
        stabilityMs,
        reason: "recognized"
      };
    }

    return {
      token: expectedToken,
      confidence,
      handDetected: true,
      stabilityMs,
      reason: "unstable"
    };
  };
}

export function createBrowserFrameSignalRuntime(
  options: BrowserFrameSignalRecognizerOptions = {}
): LiveGestureFrameRuntime {
  return createFrameRecognizerRuntime(createBrowserFrameSignalRecognizer(options));
}

export function createNoopLiveGestureFrameRecognizer(): LiveGestureFrameRecognizer {
  return ({ expectedToken }) => ({
    token: null,
    confidence: 0,
    handDetected: false,
    stabilityMs: 0,
    reason: expectedToken ? "no_hand" : "camera_ready"
  });
}

export function createNoopLiveGestureFrameRuntime(): LiveGestureFrameRuntime {
  return createFrameRecognizerRuntime(createNoopLiveGestureFrameRecognizer());
}

function createDefaultFrameSignalSampler(): (
  video: HTMLVideoElement
) => LiveGestureFrameSignalSample | null {
  if (typeof document === "undefined") {
    return () => ({ hasFrame: false, signalScore: 0 });
  }

  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null | undefined;
  let previousLuma: Uint8ClampedArray | null = null;

  return (video) => {
    if (getVideoFrameWidth(video) <= 0 || getVideoFrameHeight(video) <= 0) {
      previousLuma = null;

      return {
        hasFrame: false,
        signalScore: 0
      };
    }

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = FRAME_SIGNAL_SAMPLE_WIDTH;
      canvas.height = FRAME_SIGNAL_SAMPLE_HEIGHT;
    }

    if (context === undefined) {
      context = canvas.getContext("2d", { willReadFrequently: true });
    }

    if (!context) {
      previousLuma = null;

      return {
        hasFrame: false,
        signalScore: 0
      };
    }

    try {
      context.drawImage(
        video,
        0,
        0,
        FRAME_SIGNAL_SAMPLE_WIDTH,
        FRAME_SIGNAL_SAMPLE_HEIGHT
      );
      const imageData = context.getImageData(
        0,
        0,
        FRAME_SIGNAL_SAMPLE_WIDTH,
        FRAME_SIGNAL_SAMPLE_HEIGHT
      );
      const luma = new Uint8ClampedArray(
        FRAME_SIGNAL_SAMPLE_WIDTH * FRAME_SIGNAL_SAMPLE_HEIGHT
      );
      let sum = 0;
      let squareSum = 0;
      let motionSum = 0;

      for (let pixelIndex = 0; pixelIndex < luma.length; pixelIndex += 1) {
        const sourceIndex = pixelIndex * 4;
        const value = Math.round(
          imageData.data[sourceIndex] * 0.299 +
            imageData.data[sourceIndex + 1] * 0.587 +
            imageData.data[sourceIndex + 2] * 0.114
        );
        const normalizedValue = value / 255;
        luma[pixelIndex] = value;
        sum += normalizedValue;
        squareSum += normalizedValue * normalizedValue;

        if (previousLuma) {
          motionSum += Math.abs(value - previousLuma[pixelIndex]) / 255;
        }
      }

      const pixelCount = luma.length;
      const mean = sum / pixelCount;
      const variance = Math.max(0, squareSum / pixelCount - mean * mean);
      const contrastScore = Math.sqrt(variance) * 2;
      const motionScore = previousLuma ? (motionSum / pixelCount) * 4 : 0;

      previousLuma = luma;

      return {
        hasFrame: true,
        signalScore: clamp01(Math.max(contrastScore, motionScore))
      };
    } catch {
      previousLuma = null;

      return {
        hasFrame: false,
        signalScore: 0
      };
    }
  };
}

function getVideoFrameWidth(video: HTMLVideoElement): number {
  return video.videoWidth || video.clientWidth || video.width || 0;
}

function getVideoFrameHeight(video: HTMLVideoElement): number {
  return video.videoHeight || video.clientHeight || video.height || 0;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
