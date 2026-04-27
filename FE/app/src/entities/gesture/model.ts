export type GestureKey =
  | "open_palm"
  | "closed_fist"
  | "pinch"
  | "thumb_up"
  | "swipe_left"
  | "swipe_right";

export type GestureToken = string;

export type GestureReading = {
  gestureKey: GestureKey | null;
  confidence: number;
  latencyMs: number;
};

export const EMPTY_GESTURE_READING: GestureReading = {
  gestureKey: null,
  confidence: 0,
  latencyMs: 0
};
