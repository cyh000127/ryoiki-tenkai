import {
  battleFlowReducer,
  initialBattleFlowState
} from "../../src/features/battle-flow/model/battleFlow";
import type { BattleState } from "../../src/entities/game/model";

describe("battleFlowReducer", () => {
  function createStartedBattle(playerId = initialBattleFlowState.player.playerId): BattleState {
    return {
      battleSessionId: "battle_test",
      matchId: "match_test",
      status: "ACTIVE",
      turnNumber: 1,
      turnOwnerPlayerId: playerId,
      self: {
        playerId,
        hp: 100,
        mana: 100,
        cooldowns: {}
      },
      opponent: {
        playerId: "pl_practice",
        hp: 100,
        mana: 100,
        cooldowns: {}
      },
      battleLog: [],
      winnerPlayerId: null
    };
  }

  function createMatchedBattle() {
    const queued = battleFlowReducer(initialBattleFlowState, { type: "startQueue" });
    const ready = battleFlowReducer(queued, { type: "queueReady" });
    const found = battleFlowReducer(ready, {
      type: "matchFound",
      battleSessionId: "battle_test"
    });
    return battleFlowReducer(found, {
      type: "battleStarted",
      battle: createStartedBattle()
    });
  }

  function completeDefaultSequence() {
    const matched = createMatchedBattle();
    const firstStep = battleFlowReducer(matched, {
      type: "receiveGestureInput",
      gesture: "seal_1",
      confidence: 0.91,
      source: "debug_fallback"
    });

    return battleFlowReducer(firstStep, {
      type: "receiveGestureInput",
      gesture: "seal_3",
      confidence: 0.91,
      source: "debug_fallback"
    });
  }

  it("creates a matched battle from queue", () => {
    const queued = battleFlowReducer(initialBattleFlowState, { type: "startQueue" });
    const ready = battleFlowReducer(queued, { type: "queueReady" });
    const found = battleFlowReducer(ready, {
      type: "matchFound",
      battleSessionId: "battle_test"
    });
    const matched = battleFlowReducer(found, {
      type: "battleStarted",
      battle: createStartedBattle()
    });

    expect(matched.screen).toBe("battle");
    expect(matched.queueStatus).toBe("MATCHED");
    expect(matched.battle?.turnOwnerPlayerId).toBe(matched.player.playerId);
  });

  it("requires the full target sequence before submitting a skill", () => {
    const matched = createMatchedBattle();
    const rejected = battleFlowReducer(matched, { type: "submitSkill" });

    expect(rejected.input.localFailureReason).toBe("sequence_incomplete");
    expect(rejected.input.serverRejectionReason).toBeNull();
  });

  it("waits for server confirmation before applying completed skill damage", () => {
    const ready = completeDefaultSequence();
    const submitted = battleFlowReducer(ready, { type: "submitSkill" });

    expect(submitted.input.serverConfirmationStatus).toBe("PENDING");
    expect(submitted.battle?.opponent.hp).toBe(100);

    const confirmed = battleFlowReducer(submitted, {
      type: "battleStateUpdated",
      latencyMs: 72,
      battle: {
        ...submitted.battle!,
        turnNumber: 3,
        turnOwnerPlayerId: submitted.player.playerId,
        self: {
          ...submitted.battle!.self,
          hp: 75,
          mana: 90
        },
        opponent: {
          ...submitted.battle!.opponent,
          hp: 75,
          mana: 80
        },
        battleLog: [
          {
            turnNumber: 1,
            message: "pulse_strike dealt 25"
          },
          {
            turnNumber: 2,
            message: "pulse_strike dealt 25"
          }
        ]
      }
    });

    expect(confirmed.input.serverConfirmationStatus).toBe("CONFIRMED");
    expect(confirmed.battle?.opponent.hp).toBe(75);
    expect(confirmed.battle?.self.hp).toBe(75);
    expect(confirmed.battle?.turnOwnerPlayerId).toBe(confirmed.player.playerId);
    expect(confirmed.recentEvents[0]).toBe("battle.state_updated");
  });

  it("records specific gesture failure reasons", () => {
    const matched = createMatchedBattle();
    const lowConfidence = battleFlowReducer(matched, {
      type: "receiveGestureInput",
      gesture: "seal_1",
      confidence: 0.4,
      source: "debug_fallback"
    });
    const mismatch = battleFlowReducer(matched, {
      type: "receiveGestureInput",
      gesture: "seal_3",
      confidence: 0.91,
      source: "debug_fallback"
    });

    expect(lowConfidence.input.localFailureReason).toBe("confidence_low");
    expect(lowConfidence.input.serverRejectionReason).toBeNull();
    expect(mismatch.input.localFailureReason).toBe("sequence_mismatch");
    expect(mismatch.input.serverRejectionReason).toBeNull();
  });

  it("keeps debug fallback input separate from live hand-detection state", () => {
    const matched = createMatchedBattle();
    const debugInput = battleFlowReducer(matched, {
      type: "receiveGestureInput",
      gesture: "seal_1",
      confidence: 0.91,
      source: "debug_fallback"
    });
    const liveInput = battleFlowReducer(debugInput, {
      type: "receiveGestureInput",
      gesture: "seal_3",
      confidence: 0.91,
      source: "live_camera"
    });

    expect(debugInput.input.lastInputSource).toBe("debug_fallback");
    expect(debugInput.input.handDetected).toBe(false);
    expect(liveInput.input.lastInputSource).toBe("live_camera");
    expect(liveInput.input.handDetected).toBe(true);
  });

  it("updates live camera observation without advancing the gesture sequence", () => {
    const matched = createMatchedBattle();
    const observed = battleFlowReducer(matched, {
      type: "receiveGestureObservation",
      cameraReady: true,
      handDetected: false,
      gesture: null,
      confidence: 0,
      source: "live_camera"
    });

    expect(observed.input.cameraReady).toBe(true);
    expect(observed.input.handDetected).toBe(false);
    expect(observed.input.lastInputSource).toBe("live_camera");
    expect(observed.input.currentGesture).toBeNull();
    expect(observed.input.currentStep).toBe(0);
    expect(observed.recentEvents[0]).toBe("gesture.live_observed");
  });

  it("maps server rejection reasons into UI failure states", () => {
    const ready = completeDefaultSequence();
    const submitted = battleFlowReducer(ready, { type: "submitSkill" });
    const rejected = battleFlowReducer(submitted, {
      type: "actionRejected",
      reason: "INVALID_TURN",
      latencyMs: 41
    });

    expect(rejected.input.serverConfirmationStatus).toBe("REJECTED");
    expect(rejected.input.localFailureReason).toBeNull();
    expect(rejected.input.serverRejectionReason).toBe("not_your_turn");
    expect(rejected.input.networkLatencyMs).toBe(41);
    expect(rejected.recentEvents[0]).toBe("battle.action_rejected");
  });

  it("moves to the result screen from a server battle-ended event", () => {
    const matched = createMatchedBattle();
    const ended = battleFlowReducer(matched, {
      type: "battleEnded",
      ratingChange: 18,
      battle: {
        ...matched.battle!,
        status: "ENDED",
        turnNumber: 4,
        winnerPlayerId: matched.player.playerId
      }
    });

    expect(ended.screen).toBe("result");
    expect(ended.player.rating).toBe(initialBattleFlowState.player.rating + 18);
    expect(ended.player.wins).toBe(initialBattleFlowState.player.wins + 1);
    expect(ended.history[0]).toMatchObject({
      matchId: "match_test",
      result: "WIN",
      ratingChange: 18,
      turnCount: 4
    });
  });

  it("ignores delayed queue and stale battle snapshots after the battle has advanced", () => {
    const matched = createMatchedBattle();
    const advanced = battleFlowReducer(matched, {
      type: "battleStateUpdated",
      latencyMs: 24,
      battle: {
        ...matched.battle!,
        turnNumber: 3,
        turnOwnerPlayerId: matched.player.playerId,
        actionDeadlineAt: "2026-04-27T00:01:30Z",
        self: {
          ...matched.battle!.self,
          hp: 75,
          mana: 90
        },
        opponent: {
          ...matched.battle!.opponent,
          hp: 75,
          mana: 80
        },
        battleLog: [
          {
            turnNumber: 1,
            message: "pulse_strike dealt 25"
          },
          {
            turnNumber: 2,
            message: "pulse_strike dealt 25"
          }
        ]
      }
    });

    const delayedQueueReady = battleFlowReducer(advanced, { type: "queueReady" });
    const delayedMatchFound = battleFlowReducer(delayedQueueReady, {
      type: "matchFound",
      battleSessionId: "battle_test"
    });
    const staleStarted = battleFlowReducer(delayedMatchFound, {
      type: "battleStarted",
      battle: createStartedBattle()
    });

    expect(staleStarted.screen).toBe("battle");
    expect(staleStarted.queueStatus).toBe("MATCHED");
    expect(staleStarted.battle?.turnNumber).toBe(3);
    expect(staleStarted.battle?.self.hp).toBe(75);
  });

  it("keeps rematch queue-ready handling while avoiding duplicate battle-ended application", () => {
    const matched = createMatchedBattle();
    const endedBattle = {
      ...matched.battle!,
      status: "ENDED" as const,
      turnNumber: 4,
      winnerPlayerId: matched.player.playerId
    };

    const ended = battleFlowReducer(matched, {
      type: "battleEnded",
      ratingChange: 18,
      battle: endedBattle
    });
    const duplicateEnded = battleFlowReducer(ended, {
      type: "battleEnded",
      ratingChange: 18,
      battle: endedBattle
    });
    const requeued = battleFlowReducer(duplicateEnded, { type: "startQueue" });
    const ready = battleFlowReducer(requeued, { type: "queueReady" });

    expect(duplicateEnded.player.rating).toBe(initialBattleFlowState.player.rating + 18);
    expect(duplicateEnded.player.wins).toBe(initialBattleFlowState.player.wins + 1);
    expect(duplicateEnded.history).toHaveLength(1);
    expect(ready.screen).toBe("matchmaking");
    expect(ready.queueStatus).toBe("SEARCHING");
    expect(ready.socketStatus).toBe("CONNECTED");
  });
});
