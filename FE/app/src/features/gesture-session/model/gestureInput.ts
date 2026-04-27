export type GestureInputSource = "live_camera" | "debug_fallback";

export type NormalizedGestureInput = {
  gesture: string;
  confidence: number;
  source: GestureInputSource;
};

export const DEBUG_FALLBACK_CONFIDENCE = 0.91;

export const DEBUG_FALLBACK_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.MODE === "test" ||
  import.meta.env.VITE_ENABLE_DEBUG_FALLBACK === "true";

export function createDebugFallbackInput(
  gesture: string,
  confidence = DEBUG_FALLBACK_CONFIDENCE
): NormalizedGestureInput {
  return {
    gesture,
    confidence,
    source: "debug_fallback"
  };
}

export function createDeterministicFallbackSequence(
  targetSequence: readonly string[],
  confidence = DEBUG_FALLBACK_CONFIDENCE
): NormalizedGestureInput[] {
  return targetSequence.map((gesture) => createDebugFallbackInput(gesture, confidence));
}
