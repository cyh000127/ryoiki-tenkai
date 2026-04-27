import {
  battleFlowReducer,
  initialBattleFlowState
} from "../../src/features/battle-flow/model/battleFlow";

describe("battleFlowReducer", () => {
  it("creates a matched battle from queue", () => {
    const queued = battleFlowReducer(initialBattleFlowState, { type: "startQueue" });
    const matched = battleFlowReducer(queued, { type: "matchFound" });

    expect(matched.screen).toBe("battle");
    expect(matched.queueStatus).toBe("MATCHED");
    expect(matched.battle?.turnOwnerPlayerId).toBe(matched.player.playerId);
  });

  it("requires the full target sequence before submitting a skill", () => {
    const matched = battleFlowReducer(
      battleFlowReducer(initialBattleFlowState, { type: "startQueue" }),
      { type: "matchFound" }
    );
    const rejected = battleFlowReducer(matched, { type: "submitSkill" });

    expect(rejected.input.failureReason).toBe("sequence_incomplete");
  });

  it("applies damage after the selected sequence is completed", () => {
    const matched = battleFlowReducer(
      battleFlowReducer(initialBattleFlowState, { type: "startQueue" }),
      { type: "matchFound" }
    );
    const firstStep = battleFlowReducer(matched, {
      type: "simulateGestureStep",
      gesture: "seal_1",
      confidence: 0.91
    });
    const secondStep = battleFlowReducer(firstStep, {
      type: "simulateGestureStep",
      gesture: "seal_3",
      confidence: 0.91
    });
    const submitted = battleFlowReducer(secondStep, { type: "submitSkill" });

    expect(submitted.battle?.opponent.hp).toBe(75);
    expect(submitted.recentEvents[0]).toBe("battle.state_updated");
  });
});
