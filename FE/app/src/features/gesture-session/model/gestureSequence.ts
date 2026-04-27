import type { GestureToken } from "../../../entities/gesture/model";

export type GestureSequenceStatus = "idle" | "tracking" | "mismatch" | "timeout" | "complete";

export type GestureSequenceFailureReason =
  | "confidence_low"
  | "sequence_mismatch"
  | "timeout"
  | null;

export type GestureSequenceConfig = {
  targetSequence: readonly GestureToken[];
  confidenceThreshold: number;
  holdDurationMs: number;
  debounceMs: number;
  stepTimeoutMs: number;
};

export type GestureSequenceInput = {
  token: GestureToken | null;
  confidence: number;
  atMs: number;
};

export type GestureSequenceCandidate = {
  token: GestureToken;
  startedAtMs: number;
  lastSeenAtMs: number;
};

export type GestureSequenceState = {
  status: GestureSequenceStatus;
  currentStep: number;
  acceptedTokens: GestureToken[];
  candidate: GestureSequenceCandidate | null;
  sequenceStartedAtMs: number | null;
  lastAcceptedAtMs: number | null;
  completedAtMs: number | null;
  failureReason: GestureSequenceFailureReason;
};

export function createGestureSequenceState(): GestureSequenceState {
  return {
    status: "idle",
    currentStep: 0,
    acceptedTokens: [],
    candidate: null,
    sequenceStartedAtMs: null,
    lastAcceptedAtMs: null,
    completedAtMs: null,
    failureReason: null
  };
}

export function reduceGestureSequence(
  state: GestureSequenceState,
  input: GestureSequenceInput,
  config: GestureSequenceConfig
): GestureSequenceState {
  if (state.status === "complete") {
    return state;
  }

  if (config.targetSequence.length === 0) {
    return completeSequence(createGestureSequenceState(), input.atMs, [], input.atMs);
  }

  if (hasTimedOut(state, input.atMs, config.stepTimeoutMs)) {
    return {
      ...createGestureSequenceState(),
      status: "timeout",
      failureReason: "timeout"
    };
  }

  if (input.token === null) {
    return {
      ...state,
      status: state.currentStep > 0 ? "tracking" : "idle",
      candidate: null,
      failureReason: null
    };
  }

  if (input.confidence < config.confidenceThreshold) {
    return {
      ...state,
      status: state.currentStep > 0 ? "tracking" : "idle",
      candidate: null,
      failureReason: "confidence_low"
    };
  }

  if (isWithinDebounceWindow(state, input.atMs, config.debounceMs)) {
    return {
      ...state,
      status: "tracking",
      candidate: null,
      failureReason: null
    };
  }

  const candidate = updateCandidate(state.candidate, input.token, input.atMs);
  const hasHeldLongEnough = input.atMs - candidate.startedAtMs >= config.holdDurationMs;

  if (!hasHeldLongEnough) {
    return {
      ...state,
      status: "tracking",
      candidate,
      failureReason: null
    };
  }

  const expectedToken = config.targetSequence[state.currentStep];

  if (candidate.token !== expectedToken) {
    return {
      ...createGestureSequenceState(),
      status: "mismatch",
      failureReason: "sequence_mismatch"
    };
  }

  const acceptedTokens = [...state.acceptedTokens, candidate.token];
  const nextStep = state.currentStep + 1;
  const sequenceStartedAtMs = state.sequenceStartedAtMs ?? candidate.startedAtMs;

  if (nextStep >= config.targetSequence.length) {
    return completeSequence(state, input.atMs, acceptedTokens, sequenceStartedAtMs);
  }

  return {
    ...state,
    status: "tracking",
    currentStep: nextStep,
    acceptedTokens,
    candidate: null,
    sequenceStartedAtMs,
    lastAcceptedAtMs: input.atMs,
    failureReason: null
  };
}

function updateCandidate(
  candidate: GestureSequenceCandidate | null,
  token: GestureToken,
  atMs: number
): GestureSequenceCandidate {
  if (candidate?.token === token) {
    return {
      ...candidate,
      lastSeenAtMs: atMs
    };
  }

  return {
    token,
    startedAtMs: atMs,
    lastSeenAtMs: atMs
  };
}

function completeSequence(
  state: GestureSequenceState,
  atMs: number,
  acceptedTokens: GestureToken[],
  sequenceStartedAtMs: number
): GestureSequenceState {
  return {
    ...state,
    status: "complete",
    currentStep: acceptedTokens.length,
    acceptedTokens,
    candidate: null,
    sequenceStartedAtMs,
    lastAcceptedAtMs: atMs,
    completedAtMs: atMs,
    failureReason: null
  };
}

function hasTimedOut(
  state: GestureSequenceState,
  atMs: number,
  stepTimeoutMs: number
): boolean {
  return (
    state.currentStep > 0 &&
    state.lastAcceptedAtMs !== null &&
    atMs - state.lastAcceptedAtMs >= stepTimeoutMs
  );
}

function isWithinDebounceWindow(
  state: GestureSequenceState,
  atMs: number,
  debounceMs: number
): boolean {
  return state.lastAcceptedAtMs !== null && atMs - state.lastAcceptedAtMs < debounceMs;
}
