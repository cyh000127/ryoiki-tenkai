import {
  battleFlowReducer,
  initialBattleFlowState
} from "../../src/features/battle-flow/model/battleFlow";

describe("battleFlowReducer", () => {
  function createMatchedBattle() {
    return battleFlowReducer(
      battleFlowReducer(initialBattleFlowState, { type: "startQueue" }),
      { type: "matchFound" }
    );
  }

  function completeDefaultSequence() {
    const matched = createMatchedBattle();
    const firstStep = battleFlowReducer(matched, {
      type: "simulateGestureStep",
      gesture: "seal_1",
      confidence: 0.91
    });

    return battleFlowReducer(firstStep, {
      type: "simulateGestureStep",
      gesture: "seal_3",
      confidence: 0.91
    });
  }

  it("creates a matched battle from queue", () => {
    const queued = battleFlowReducer(initialBattleFlowState, { type: "startQueue" });
    const matched = battleFlowReducer(queued, { type: "matchFound" });

    expect(matched.screen).toBe("battle");
    expect(matched.queueStatus).toBe("MATCHED");
    expect(matched.battle?.turnOwnerPlayerId).toBe(matched.player.playerId);
  });

  it("requires the full target sequence before submitting a skill", () => {
    const matched = createMatchedBattle();
    const rejected = battleFlowReducer(matched, { type: "submitSkill" });

    expect(rejected.input.failureReason).toBe("sequence_incomplete");
  });

  it("waits for server confirmation before applying completed skill damage", () => {
    const ready = completeDefaultSequence();
    const submitted = battleFlowReducer(ready, { type: "submitSkill" });

    expect(submitted.input.serverConfirmationStatus).toBe("PENDING");
    expect(submitted.battle?.opponent.hp).toBe(100);

    const confirmed = battleFlowReducer(submitted, { type: "confirmSkill" });

    expect(confirmed.input.serverConfirmationStatus).toBe("CONFIRMED");
    expect(confirmed.battle?.opponent.hp).toBe(75);
    expect(confirmed.battle?.turnOwnerPlayerId).toBe(confirmed.battle?.opponent.playerId);
    expect(confirmed.recentEvents[0]).toBe("battle.state_updated");
  });

  it("blocks player input during the opponent turn until it resolves", () => {
    const submitted = battleFlowReducer(completeDefaultSequence(), { type: "submitSkill" });
    const opponentTurn = battleFlowReducer(submitted, { type: "confirmSkill" });
    const blocked = battleFlowReducer(opponentTurn, {
      type: "simulateGestureStep",
      gesture: "seal_1",
      confidence: 0.91
    });

    expect(blocked.input.failureReason).toBe("not_your_turn");

    const nextPlayerTurn = battleFlowReducer(blocked, { type: "resolveOpponentTurn" });

    expect(nextPlayerTurn.battle?.turnOwnerPlayerId).toBe(nextPlayerTurn.player.playerId);
    expect(nextPlayerTurn.battle?.self.hp).toBe(88);
    expect(nextPlayerTurn.input.failureReason).toBeNull();
  });

  it("records specific gesture failure reasons", () => {
    const matched = createMatchedBattle();
    const lowConfidence = battleFlowReducer(matched, {
      type: "simulateGestureStep",
      gesture: "seal_1",
      confidence: 0.4
    });
    const mismatch = battleFlowReducer(matched, {
      type: "simulateGestureStep",
      gesture: "seal_3",
      confidence: 0.91
    });

    expect(lowConfidence.input.failureReason).toBe("confidence_low");
    expect(mismatch.input.failureReason).toBe("sequence_mismatch");
  });
});
