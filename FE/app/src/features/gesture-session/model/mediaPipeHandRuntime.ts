import type {
  HandLandmarkerResult,
  NormalizedLandmark
} from "@mediapipe/tasks-vision";

import type {
  LiveGestureFrameRuntime,
  LiveGestureLandmark,
  LiveGestureObservation,
  LiveGestureRuntimeSession
} from "./liveGestureRuntime";

const MEDIAPIPE_TASKS_VERSION = "0.10.35";
const DEFAULT_WASM_BASE_PATH =
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;
const DEFAULT_HAND_MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const DEFAULT_MIN_RECOGNITION_CONFIDENCE = 0.65;
const DEFAULT_RECOGNITION_STABLE_MS = 450;

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

type HandLandmarkerLike = {
  detectForVideo: (
    videoFrame: HTMLVideoElement,
    timestamp: number
  ) => HandLandmarkerResult;
  close?: () => void;
};

export type MediaPipeHandGestureRuntimeOptions = {
  handLandmarkerLoader?: () => Promise<HandLandmarkerLike>;
  minRecognitionConfidence?: number;
  recognitionStableMs?: number;
  wasmBasePath?: string;
  modelAssetPath?: string;
};

export type ClassifiedHandGesture = {
  token: string;
  confidence: number;
};

type HandFeatures = {
  allFingersExtended: boolean;
  foldedFingers: number;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  pinchDistance: number;
  palmCenterY: number;
};

let defaultHandLandmarkerPromise: Promise<HandLandmarkerLike> | null = null;

export function createMediaPipeHandGestureRuntime(
  options: MediaPipeHandGestureRuntimeOptions = {}
): LiveGestureFrameRuntime {
  const minRecognitionConfidence =
    options.minRecognitionConfidence ?? DEFAULT_MIN_RECOGNITION_CONFIDENCE;
  const recognitionStableMs =
    options.recognitionStableMs ?? DEFAULT_RECOGNITION_STABLE_MS;

  return {
    async start(): Promise<LiveGestureRuntimeSession> {
      const handLandmarker = await (
        options.handLandmarkerLoader?.() ??
        loadDefaultHandLandmarker(options)
      );
      const shouldCloseOnStop = Boolean(options.handLandmarkerLoader);
      let stableToken: string | null = null;
      let stableSinceMs: number | null = null;

      function resetStability() {
        stableToken = null;
        stableSinceMs = null;
      }

      return {
        recognizeFrame: ({ video, expectedToken, atMs }) => {
          const result = handLandmarker.detectForVideo(video, atMs);
          const handLandmarks = toLiveGestureLandmarks(result.landmarks);
          const classifiedGesture = classifyMediaPipeHandGesture(
            result,
            expectedToken
          );

          if (!classifiedGesture) {
            resetStability();

            return {
              token: null,
              confidence: 0,
              handDetected: result.landmarks.length > 0,
              stabilityMs: 0,
              reason: result.landmarks.length > 0 ? "unstable" : "no_hand",
              handLandmarks
            };
          }

          if (stableToken !== classifiedGesture.token || stableSinceMs === null) {
            stableToken = classifiedGesture.token;
            stableSinceMs = atMs;
          }

          const stabilityMs = Math.max(0, atMs - stableSinceMs);
          const isRecognized =
            stabilityMs >= recognitionStableMs &&
            classifiedGesture.confidence >= minRecognitionConfidence;

          return {
            token: classifiedGesture.token,
            confidence: classifiedGesture.confidence,
            handDetected: true,
            stabilityMs,
            reason: isRecognized ? "recognized" : "unstable",
            handLandmarks
          } satisfies LiveGestureObservation;
        },
        stop: () => {
          if (shouldCloseOnStop) {
            handLandmarker.close?.();
          }
        }
      };
    }
  };
}

export function classifyMediaPipeHandGesture(
  result: Pick<HandLandmarkerResult, "landmarks" | "handedness">,
  expectedToken: string | null = null
): ClassifiedHandGesture | null {
  if (result.landmarks.length === 0) {
    return null;
  }

  const confidence = getHandPresenceConfidence(result);
  const primaryHand = result.landmarks[0];
  const primaryFeatures = getHandFeatures(primaryHand);
  const twoHandDistance =
    result.landmarks.length >= 2
      ? distance(getPalmCenter(result.landmarks[0]), getPalmCenter(result.landmarks[1]))
      : Number.POSITIVE_INFINITY;
  const hasTwoHandSeal = twoHandDistance < 0.24;

  if (expectedToken) {
    if (matchesExpectedToken(expectedToken, primaryFeatures, hasTwoHandSeal)) {
      return {
        token: expectedToken,
        confidence
      };
    }
  }

  if (isPinch(primaryFeatures)) {
    return { token: "pinch", confidence };
  }

  if (isIndexUp(primaryFeatures)) {
    return { token: "index_up", confidence };
  }

  if (isTwoFinger(primaryFeatures)) {
    return { token: "two_finger_cross", confidence };
  }

  if (hasTwoHandSeal) {
    return { token: "domain_seal", confidence };
  }

  if (primaryFeatures.allFingersExtended) {
    return { token: "red_orb", confidence };
  }

  if (primaryFeatures.foldedFingers >= 3) {
    return { token: "shadow_seal", confidence };
  }

  return null;
}

function matchesExpectedToken(
  expectedToken: string,
  features: HandFeatures,
  hasTwoHandSeal: boolean
): boolean {
  switch (expectedToken) {
    case "index_up":
      return isIndexUp(features);
    case "pinch":
      return isPinch(features);
    case "blue_orb":
      return isCurvedPalm(features);
    case "red_orb":
      return features.allFingersExtended;
    case "orb_collision":
      return hasTwoHandSeal;
    case "two_finger_cross":
      return isTwoFinger(features) || hasTwoHandSeal;
    case "flat_prayer":
      return hasTwoHandSeal;
    case "domain_seal":
      return hasTwoHandSeal || isTwoFinger(features);
    case "shadow_seal":
      return features.foldedFingers >= 3 || features.palmCenterY > 0.62;
    default:
      return false;
  }
}

function toLiveGestureLandmarks(
  landmarkGroups: NormalizedLandmark[][]
): LiveGestureLandmark[][] {
  return landmarkGroups.map((landmarks) =>
    landmarks.map((landmark) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z
    }))
  );
}

function getHandFeatures(landmarks: NormalizedLandmark[]): HandFeatures {
  const indexExtended = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
  const middleExtended = isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
  const ringExtended = isFingerExtended(landmarks, RING_TIP, RING_PIP);
  const pinkyExtended = isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);
  const extendedFlags = [indexExtended, middleExtended, ringExtended, pinkyExtended];

  return {
    allFingersExtended: extendedFlags.every(Boolean),
    foldedFingers: extendedFlags.filter((isExtended) => !isExtended).length,
    indexExtended,
    middleExtended,
    ringExtended,
    pinkyExtended,
    pinchDistance: distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]),
    palmCenterY: getPalmCenter(landmarks).y
  };
}

function isIndexUp(features: HandFeatures): boolean {
  return (
    features.indexExtended &&
    !features.middleExtended &&
    !features.ringExtended &&
    !features.pinkyExtended
  );
}

function isPinch(features: HandFeatures): boolean {
  return features.pinchDistance < 0.085;
}

function isTwoFinger(features: HandFeatures): boolean {
  return (
    features.indexExtended &&
    features.middleExtended &&
    !features.ringExtended &&
    !features.pinkyExtended
  );
}

function isCurvedPalm(features: HandFeatures): boolean {
  return (
    !features.allFingersExtended &&
    features.foldedFingers <= 2 &&
    features.pinchDistance >= 0.085 &&
    features.pinchDistance < 0.22
  );
}

function isFingerExtended(
  landmarks: NormalizedLandmark[],
  tipIndex: number,
  pipIndex: number
): boolean {
  return landmarks[tipIndex].y < landmarks[pipIndex].y - 0.025;
}

function getPalmCenter(landmarks: NormalizedLandmark[]): Pick<NormalizedLandmark, "x" | "y"> {
  const wrist = landmarks[WRIST];
  const indexPip = landmarks[INDEX_PIP];
  const pinkyPip = landmarks[PINKY_PIP];

  return {
    x: (wrist.x + indexPip.x + pinkyPip.x) / 3,
    y: (wrist.y + indexPip.y + pinkyPip.y) / 3
  };
}

function distance(
  first: Pick<NormalizedLandmark, "x" | "y">,
  second: Pick<NormalizedLandmark, "x" | "y">
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getHandPresenceConfidence(
  result: Pick<HandLandmarkerResult, "handedness">
): number {
  const score = result.handedness[0]?.[0]?.score;

  return typeof score === "number" ? clamp(score, 0, 1) : 0.78;
}

function loadDefaultHandLandmarker(
  options: Pick<MediaPipeHandGestureRuntimeOptions, "modelAssetPath" | "wasmBasePath">
): Promise<HandLandmarkerLike> {
  if (!defaultHandLandmarkerPromise) {
    defaultHandLandmarkerPromise = createDefaultHandLandmarker(options);
  }

  return defaultHandLandmarkerPromise;
}

async function createDefaultHandLandmarker(
  options: Pick<MediaPipeHandGestureRuntimeOptions, "modelAssetPath" | "wasmBasePath">
): Promise<HandLandmarkerLike> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
    options.wasmBasePath ?? DEFAULT_WASM_BASE_PATH
  );

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: options.modelAssetPath ?? DEFAULT_HAND_MODEL_ASSET_PATH
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
