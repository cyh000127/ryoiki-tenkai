import {
  createGestureSequenceState,
  reduceGestureSequence,
  type GestureSequenceConfig,
  type GestureSequenceInput,
  type GestureSequenceState
} from "../../src/features/gesture-session/model/gestureSequence";

const config: GestureSequenceConfig = {
  targetSequence: ["open_palm", "pinch"],
  confidenceThreshold: 0.7,
  holdDurationMs: 120,
  debounceMs: 80,
  stepTimeoutMs: 500
};

function advance(
  state: GestureSequenceState,
  input: GestureSequenceInput,
  overrideConfig: GestureSequenceConfig = config
): GestureSequenceState {
  return reduceGestureSequence(state, input, overrideConfig);
}

describe("gesture sequence state machine", () => {
  it("rejects low-confidence tokens without advancing the sequence", () => {
    const state = advance(createGestureSequenceState(), {
      token: "open_palm",
      confidence: 0.69,
      atMs: 100
    });

    expect(state.status).toBe("idle");
    expect(state.currentStep).toBe(0);
    expect(state.candidate).toBeNull();
    expect(state.failureReason).toBe("confidence_low");
  });

  it("requires hold duration and debounces accepted tokens", () => {
    const initial = createGestureSequenceState();
    const holding = advance(initial, {
      token: "open_palm",
      confidence: 0.91,
      atMs: 100
    });
    const accepted = advance(holding, {
      token: "open_palm",
      confidence: 0.92,
      atMs: 220
    });
    const debounced = advance(accepted, {
      token: "pinch",
      confidence: 0.93,
      atMs: 250
    });

    expect(holding.status).toBe("tracking");
    expect(holding.currentStep).toBe(0);
    expect(accepted.currentStep).toBe(1);
    expect(accepted.acceptedTokens).toEqual(["open_palm"]);
    expect(debounced.currentStep).toBe(1);
    expect(debounced.candidate).toBeNull();
  });

  it("resets progress when a held token does not match the expected sequence step", () => {
    const firstStep = advance(
      advance(createGestureSequenceState(), {
        token: "open_palm",
        confidence: 0.91,
        atMs: 100
      }),
      {
        token: "open_palm",
        confidence: 0.91,
        atMs: 220
      }
    );

    const mismatch = advance(
      advance(firstStep, {
        token: "thumb_up",
        confidence: 0.94,
        atMs: 320
      }),
      {
        token: "thumb_up",
        confidence: 0.94,
        atMs: 440
      }
    );

    expect(mismatch.status).toBe("mismatch");
    expect(mismatch.currentStep).toBe(0);
    expect(mismatch.acceptedTokens).toEqual([]);
    expect(mismatch.failureReason).toBe("sequence_mismatch");
  });

  it("times out when the next sequence step is not completed in time", () => {
    const firstStep = advance(
      advance(createGestureSequenceState(), {
        token: "open_palm",
        confidence: 0.91,
        atMs: 100
      }),
      {
        token: "open_palm",
        confidence: 0.91,
        atMs: 220
      }
    );
    const timedOut = advance(firstStep, {
      token: "pinch",
      confidence: 0.92,
      atMs: 720
    });

    expect(timedOut.status).toBe("timeout");
    expect(timedOut.currentStep).toBe(0);
    expect(timedOut.failureReason).toBe("timeout");
  });

  it("marks the sequence complete after every target token is held in order", () => {
    const firstStep = advance(
      advance(createGestureSequenceState(), {
        token: "open_palm",
        confidence: 0.91,
        atMs: 100
      }),
      {
        token: "open_palm",
        confidence: 0.91,
        atMs: 220
      }
    );
    const secondHolding = advance(firstStep, {
      token: "pinch",
      confidence: 0.93,
      atMs: 320
    });
    const complete = advance(secondHolding, {
      token: "pinch",
      confidence: 0.93,
      atMs: 440
    });

    expect(complete.status).toBe("complete");
    expect(complete.currentStep).toBe(2);
    expect(complete.acceptedTokens).toEqual(["open_palm", "pinch"]);
    expect(complete.completedAtMs).toBe(440);
  });
});
