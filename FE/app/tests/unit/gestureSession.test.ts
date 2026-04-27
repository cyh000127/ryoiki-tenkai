import {
  gestureSessionReducer,
  initialGestureSessionState
} from "../../src/features/gesture-session/model/gestureSession";

describe("gestureSessionReducer", () => {
  it("starts tracking", () => {
    const state = gestureSessionReducer(initialGestureSessionState, { type: "start" });

    expect(state.isCameraReady).toBe(true);
    expect(state.isTracking).toBe(true);
  });

  it("accepts a detected gesture command", () => {
    const detected = gestureSessionReducer(initialGestureSessionState, {
      type: "detect",
      gestureKey: "pinch",
      confidence: 0.91,
      latencyMs: 42
    });
    const accepted = gestureSessionReducer(detected, {
      type: "accept",
      skillActionKey: "skill.confirm"
    });

    expect(accepted.commandStatus).toBe("accepted");
    expect(accepted.selectedSkillActionKey).toBe("skill.confirm");
  });
});
