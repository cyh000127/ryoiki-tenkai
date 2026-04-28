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

export function createFrameRecognizerRuntime(
  frameRecognizer: LiveGestureFrameRecognizer
): LiveGestureFrameRuntime {
  return {
    start: () => ({
      recognizeFrame: frameRecognizer
    })
  };
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
