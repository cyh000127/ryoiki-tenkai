import {
  DEFAULT_ANIMSETS,
  DEFAULT_SKILLSET,
  type BattleState,
  type MatchRecord,
  type PlayerSummary,
  type Skill
} from "../../../entities/game/model";
import type { GestureInputSource } from "../../gesture-session/model/gestureInput";

export type ScreenKey = "home" | "loadout" | "matchmaking" | "battle" | "result" | "history";

export type InputFailureReason =
  | "confidence_low"
  | "sequence_mismatch"
  | "sequence_incomplete"
  | "not_your_turn"
  | "insufficient_mana"
  | "server_pending";

export type ServerConfirmationStatus = "IDLE" | "PENDING" | "CONFIRMED" | "REJECTED";

export type InputFeedback = {
  cameraReady: boolean;
  handDetected: boolean;
  lastInputSource: GestureInputSource | null;
  currentGesture: string | null;
  targetSequence: string[];
  currentStep: number;
  localFailureReason: InputFailureReason | null;
  serverRejectionReason: InputFailureReason | null;
  confidence: number;
  networkLatencyMs: number;
  serverConfirmationStatus: ServerConfirmationStatus;
};

export type BattleFlowState = {
  screen: ScreenKey;
  player: PlayerSummary;
  equippedSkillsetId: string;
  equippedAnimsetId: string;
  selectedSkillId: string;
  queueStatus: "IDLE" | "SEARCHING" | "MATCHED";
  socketStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED";
  battle: BattleState | null;
  input: InputFeedback;
  history: MatchRecord[];
  recentEvents: string[];
};

export type BattleFlowAction =
  | { type: "go"; screen: ScreenKey }
  | { type: "createGuest"; nickname: string }
  | { type: "hydratePlayer"; player: PlayerSummary }
  | { type: "hydrateLoadout"; skillsetId: string; animsetId: string; skillId: string }
  | { type: "equip"; skillsetId: string; animsetId: string; skillId: string }
  | { type: "startQueue" }
  | { type: "queueReady" }
  | { type: "matchFound"; battleSessionId: string }
  | { type: "battleStarted"; battle: BattleState }
  | { type: "actionRejected"; reason: string | null; latencyMs: number }
  | { type: "battleStateUpdated"; battle: BattleState; latencyMs: number }
  | { type: "battleEnded"; battle: BattleState; ratingChange: number }
  | { type: "leaveQueue" }
  | { type: "socketReconnecting" }
  | { type: "socketDisconnected" }
  | { type: "selectSkill"; skillId: string }
  | {
      type: "receiveGestureObservation";
      cameraReady: boolean;
      handDetected: boolean;
      gesture: string | null;
      confidence: number;
      source: GestureInputSource;
    }
  | { type: "receiveGestureInput"; gesture: string; confidence: number; source: GestureInputSource }
  | { type: "submitSkill" }
  | { type: "resetGestureProgress" }
  | { type: "resetBattle" };

export const initialBattleFlowState: BattleFlowState = {
  screen: "home",
  player: {
    playerId: "pl_local",
    nickname: "local_player",
    rating: 1000,
    wins: 0,
    losses: 0
  },
  equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
  equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
  selectedSkillId: DEFAULT_SKILLSET.skills[0].skillId,
  queueStatus: "IDLE",
  socketStatus: "DISCONNECTED",
  battle: null,
  input: {
    cameraReady: false,
    handDetected: false,
    lastInputSource: null,
    currentGesture: null,
    targetSequence: DEFAULT_SKILLSET.skills[0].gestureSequence,
    currentStep: 0,
    localFailureReason: null,
    serverRejectionReason: null,
    confidence: 0,
    networkLatencyMs: 0,
    serverConfirmationStatus: "IDLE"
  },
  history: [],
  recentEvents: []
};

export function battleFlowReducer(
  state: BattleFlowState,
  action: BattleFlowAction
): BattleFlowState {
  switch (action.type) {
    case "go":
      return { ...state, screen: action.screen };
    case "createGuest":
      return {
        ...state,
        player: { ...state.player, nickname: action.nickname || state.player.nickname },
        recentEvents: prependEvent(state, "guest.created")
      };
    case "hydratePlayer":
      return {
        ...state,
        player: action.player,
        recentEvents: prependEvent(state, "player.restored")
      };
    case "hydrateLoadout":
      return {
        ...state,
        equippedSkillsetId: action.skillsetId,
        equippedAnimsetId: action.animsetId,
        selectedSkillId: action.skillId,
        input: {
          ...state.input,
          targetSequence: findSkill(action.skillId).gestureSequence,
          lastInputSource: null,
          currentStep: 0,
          currentGesture: null,
          localFailureReason: null,
          serverRejectionReason: null,
          serverConfirmationStatus: "IDLE"
        },
        recentEvents: prependEvent(state, "loadout.restored")
      };
    case "equip":
      return {
        ...state,
        equippedSkillsetId: action.skillsetId,
        equippedAnimsetId: action.animsetId,
        selectedSkillId: action.skillId,
        input: {
          ...state.input,
          targetSequence: findSkill(action.skillId).gestureSequence,
          lastInputSource: null,
          currentStep: 0,
          currentGesture: null,
          localFailureReason: null,
          serverRejectionReason: null,
          serverConfirmationStatus: "IDLE"
        },
        recentEvents: prependEvent(state, "loadout.updated")
      };
    case "startQueue":
      return {
        ...state,
        screen: "matchmaking",
        queueStatus: "SEARCHING",
        socketStatus: "CONNECTING",
        recentEvents: prependEvent(state, "matchmaking.queue.entered")
      };
    case "queueReady":
      return applyQueueReady(state);
    case "matchFound":
      return applyMatchFound(state, action.battleSessionId);
    case "battleStarted":
      return applyBattleStarted(state, action.battle);
    case "actionRejected":
      return {
        ...state,
        input: {
          ...state.input,
          localFailureReason: null,
          serverRejectionReason: mapBattleRejectionReason(action.reason),
          networkLatencyMs: action.latencyMs,
          serverConfirmationStatus: "REJECTED"
        },
        recentEvents: prependEvent(state, "battle.action_rejected")
      };
    case "battleStateUpdated":
      return applyBattleStateUpdated(state, action.battle, action.latencyMs);
    case "battleEnded":
      return finishBattleFromServer(state, action.battle, action.ratingChange);
    case "leaveQueue":
      return {
        ...state,
        screen: "home",
        queueStatus: "IDLE",
        socketStatus: "DISCONNECTED",
        battle: null,
        input: {
          ...state.input,
          cameraReady: false,
          handDetected: false,
          lastInputSource: null,
          currentGesture: null,
          currentStep: 0,
          localFailureReason: null,
          serverRejectionReason: null,
          networkLatencyMs: 0,
          serverConfirmationStatus: "IDLE"
        },
        recentEvents: prependEvent(state, "matchmaking.queue.left")
      };
    case "socketReconnecting":
      return {
        ...state,
        socketStatus: "CONNECTING",
        recentEvents: prependEvent(state, "socket.reconnecting")
      };
    case "socketDisconnected":
      return {
        ...state,
        screen: state.screen === "matchmaking" ? "home" : state.screen,
        queueStatus: state.battle ? "MATCHED" : "IDLE",
        socketStatus: "DISCONNECTED",
        input: {
          ...state.input,
          cameraReady: state.battle ? state.input.cameraReady : false,
          handDetected: state.battle ? state.input.handDetected : false,
          networkLatencyMs: state.battle ? state.input.networkLatencyMs : 0
        },
        recentEvents: prependEvent(state, "socket.disconnected")
      };
    case "selectSkill":
      return {
        ...state,
        selectedSkillId: action.skillId,
        input: {
          ...state.input,
          targetSequence: findSkill(action.skillId).gestureSequence,
          lastInputSource: null,
          currentStep: 0,
          currentGesture: null,
          localFailureReason: null,
          serverRejectionReason: null,
          serverConfirmationStatus: "IDLE"
        }
      };
    case "receiveGestureObservation":
      return {
        ...state,
        input: {
          ...state.input,
          cameraReady: action.cameraReady,
          handDetected: action.handDetected,
          lastInputSource: action.source,
          currentGesture: action.gesture,
          confidence: action.confidence
        },
        recentEvents: prependEvent(state, "gesture.live_observed")
      };
    case "receiveGestureInput":
      return applyGestureStep(state, action.gesture, action.confidence, action.source);
    case "submitSkill":
      return submitSelectedSkill(state);
    case "resetGestureProgress":
      return resetGestureProgress(state);
    case "resetBattle":
      return {
        ...state,
        screen: "home",
        queueStatus: "IDLE",
        socketStatus: "DISCONNECTED",
        battle: null,
        input: {
          ...initialBattleFlowState.input,
          targetSequence: findSkill(state.selectedSkillId).gestureSequence
        },
        recentEvents: prependEvent(state, "battle.reset")
      };
    default:
      return state;
  }
}

export function findSkill(skillId: string): Skill {
  return DEFAULT_SKILLSET.skills.find((skill) => skill.skillId === skillId) ?? DEFAULT_SKILLSET.skills[0];
}

function applyGestureStep(
  state: BattleFlowState,
  gesture: string,
  confidence: number,
  source: GestureInputSource
): BattleFlowState {
  if (state.input.serverConfirmationStatus === "PENDING") {
    return {
      ...state,
      input: {
        ...state.input,
        cameraReady: true,
        handDetected: source === "live_camera" ? true : state.input.handDetected,
        lastInputSource: source,
        currentGesture: gesture,
        confidence,
        localFailureReason: "server_pending",
        serverRejectionReason: null
      },
      recentEvents: prependEvent(state, "gesture.rejected")
    };
  }
  if (state.battle && state.battle.turnOwnerPlayerId !== state.player.playerId) {
    return {
      ...state,
      input: {
        ...state.input,
        cameraReady: true,
        handDetected: source === "live_camera" ? true : state.input.handDetected,
        lastInputSource: source,
        currentGesture: gesture,
        confidence,
        localFailureReason: "not_your_turn",
        serverRejectionReason: null,
        serverConfirmationStatus: "IDLE"
      },
      recentEvents: prependEvent(state, "gesture.rejected")
    };
  }
  const expected = state.input.targetSequence[state.input.currentStep];
  if (confidence < 0.65) {
    return {
      ...state,
      input: {
        ...state.input,
        cameraReady: true,
        handDetected: source === "live_camera" ? true : state.input.handDetected,
        lastInputSource: source,
        currentGesture: gesture,
        confidence,
        localFailureReason: "confidence_low",
        serverRejectionReason: null,
        serverConfirmationStatus: "IDLE"
      },
      recentEvents: prependEvent(state, "gesture.rejected")
    };
  }
  if (gesture !== expected) {
    return {
      ...state,
      input: {
        ...state.input,
        cameraReady: true,
        handDetected: source === "live_camera" ? true : state.input.handDetected,
        lastInputSource: source,
        currentGesture: gesture,
        confidence,
        currentStep: 0,
        localFailureReason: "sequence_mismatch",
        serverRejectionReason: null,
        serverConfirmationStatus: "IDLE"
      },
      recentEvents: prependEvent(state, "gesture.sequence_reset")
    };
  }
  return {
    ...state,
    input: {
      ...state.input,
      cameraReady: true,
      handDetected: source === "live_camera" ? true : state.input.handDetected,
      lastInputSource: source,
      currentGesture: gesture,
      confidence,
      currentStep: state.input.currentStep + 1,
      localFailureReason: null,
      serverRejectionReason: null,
      serverConfirmationStatus: "IDLE"
    },
    recentEvents: prependEvent(state, "gesture.step.accepted")
  };
}

function resetGestureProgress(state: BattleFlowState): BattleFlowState {
  return {
    ...state,
    input: {
      ...state.input,
      currentGesture: null,
      currentStep: 0,
      localFailureReason: null,
      serverRejectionReason: null,
      serverConfirmationStatus: "IDLE"
    },
    recentEvents: prependEvent(state, "gesture.reset")
  };
}

function submitSelectedSkill(state: BattleFlowState): BattleFlowState {
  const failureReason = getSubmitFailureReason(state);
  if (failureReason !== null) {
    return {
      ...state,
      input: {
        ...state.input,
        localFailureReason: failureReason,
        serverRejectionReason: null,
        serverConfirmationStatus: "IDLE"
      },
      recentEvents: prependEvent(state, "battle.action_rejected")
    };
  }

  if (!state.battle) {
    return state;
  }

  return {
    ...state,
    input: {
      ...state.input,
      localFailureReason: null,
      serverRejectionReason: null,
      networkLatencyMs: state.input.networkLatencyMs,
      serverConfirmationStatus: "PENDING"
    },
    recentEvents: prependEvent(state, "battle.action_submitted")
  };
}

function applyQueueReady(state: BattleFlowState): BattleFlowState {
  if (state.queueStatus === "MATCHED" || state.screen === "battle" || state.screen === "result") {
    return state;
  }

  return {
    ...state,
    screen: "matchmaking",
    queueStatus: "SEARCHING",
    socketStatus: "CONNECTED",
    recentEvents: prependEvent(state, "battle.match_ready")
  };
}

function applyMatchFound(state: BattleFlowState, battleSessionId: string): BattleFlowState {
  const preserveScreen =
    state.battle?.battleSessionId === battleSessionId &&
    (state.screen === "battle" || state.screen === "result");

  return {
    ...state,
    queueStatus: "MATCHED",
    socketStatus: "CONNECTED",
    screen: preserveScreen ? state.screen : "matchmaking",
    recentEvents: prependEvent(state, "battle.match_found")
  };
}

function applyBattleStarted(state: BattleFlowState, battle: BattleState): BattleFlowState {
  if (shouldIgnoreIncomingBattleSnapshot(state.battle, battle)) {
    return state;
  }

  return {
    ...state,
    screen: "battle",
    queueStatus: "MATCHED",
    socketStatus: "CONNECTED",
    battle,
    input: {
      ...state.input,
      cameraReady: true,
      handDetected: false,
      lastInputSource: null,
      currentGesture: null,
      currentStep: 0,
      localFailureReason: null,
      serverRejectionReason: null,
      networkLatencyMs: state.input.networkLatencyMs,
      serverConfirmationStatus: "IDLE"
    },
    recentEvents: prependEvent(state, "battle.started")
  };
}

function applyBattleStateUpdated(
  state: BattleFlowState,
  battle: BattleState,
  latencyMs: number
): BattleFlowState {
  if (shouldIgnoreIncomingBattleSnapshot(state.battle, battle)) {
    return state;
  }

  return {
    ...state,
    screen: "battle",
    queueStatus: "MATCHED",
    socketStatus: "CONNECTED",
    battle,
    input: {
      ...state.input,
      targetSequence: findSkill(state.selectedSkillId).gestureSequence,
      currentStep: 0,
      currentGesture: null,
      localFailureReason: null,
      serverRejectionReason: null,
      networkLatencyMs: latencyMs,
      serverConfirmationStatus: "CONFIRMED"
    },
    recentEvents: prependEvent(state, "battle.state_updated")
  };
}

function finishBattleFromServer(
  state: BattleFlowState,
  battle: BattleState,
  ratingChange: number
): BattleFlowState {
  const isCurrentBattle = state.battle?.battleSessionId === battle.battleSessionId;
  const alreadyRecordedMatch = state.history.some((record) => record.matchId === battle.matchId);
  if (alreadyRecordedMatch && !isCurrentBattle) {
    return state;
  }

  const didWin = battle.winnerPlayerId === state.player.playerId;
  const shouldApplyPlayerDelta = !alreadyRecordedMatch;
  const nextRecord: MatchRecord = {
    matchId: battle.matchId,
    result: didWin ? "WIN" : "LOSE",
    ratingChange,
    turnCount: battle.turnNumber
  };
  const nextHistory: MatchRecord[] = alreadyRecordedMatch
    ? state.history
    : [nextRecord, ...state.history];

  return {
    ...state,
    screen: "result",
    battle,
    queueStatus: "IDLE",
    socketStatus: "CONNECTED",
    player: {
      ...state.player,
      rating: state.player.rating + (shouldApplyPlayerDelta ? ratingChange : 0),
      wins: state.player.wins + (shouldApplyPlayerDelta && didWin ? 1 : 0),
      losses: state.player.losses + (shouldApplyPlayerDelta && !didWin ? 1 : 0)
    },
    input: {
      ...state.input,
      currentStep: 0,
      currentGesture: null,
      localFailureReason: null,
      serverRejectionReason: null,
      serverConfirmationStatus: "CONFIRMED"
    },
    history: nextHistory,
    recentEvents: prependEvent(state, "battle.ended")
  };
}

export function shouldIgnoreIncomingBattleSnapshot(
  currentBattle: BattleState | null,
  incomingBattle: BattleState
): boolean {
  if (!currentBattle) {
    return false;
  }

  if (currentBattle.battleSessionId !== incomingBattle.battleSessionId) {
    return currentBattle.status === "ACTIVE";
  }

  if (currentBattle.status === "ENDED" && incomingBattle.status !== "ENDED") {
    return true;
  }

  if (incomingBattle.turnNumber < currentBattle.turnNumber) {
    return true;
  }

  if (incomingBattle.turnNumber > currentBattle.turnNumber) {
    return false;
  }

  if (currentBattle.status === "ENDED" && incomingBattle.status === "ACTIVE") {
    return true;
  }

  if (incomingBattle.battleLog.length < currentBattle.battleLog.length) {
    return true;
  }

  const currentDeadline = parseBattleTimestamp(currentBattle.actionDeadlineAt);
  const incomingDeadline = parseBattleTimestamp(incomingBattle.actionDeadlineAt);
  if (currentDeadline === null || incomingDeadline === null) {
    return false;
  }
  return incomingDeadline < currentDeadline;
}

export function getSubmitFailureReason(state: BattleFlowState): InputFailureReason | null {
  if (!state.battle || state.battle.status !== "ACTIVE") {
    return null;
  }
  if (state.input.serverConfirmationStatus === "PENDING") {
    return "server_pending";
  }
  if (state.battle.turnOwnerPlayerId !== state.player.playerId) {
    return "not_your_turn";
  }
  const skill = findSkill(state.selectedSkillId);
  if (state.input.currentStep < skill.gestureSequence.length) {
    return "sequence_incomplete";
  }
  if (state.battle.self.mana < skill.manaCost) {
    return "insufficient_mana";
  }
  return null;
}

function mapBattleRejectionReason(reason: string | null): InputFailureReason | null {
  if (reason === "INVALID_GESTURE_SEQUENCE") {
    return "sequence_mismatch";
  }
  if (reason === "NOT_YOUR_TURN" || reason === "INVALID_TURN") {
    return "not_your_turn";
  }
  if (reason === "INSUFFICIENT_MANA" || reason === "SKILL_ON_COOLDOWN") {
    return "insufficient_mana";
  }
  if (reason === "DUPLICATE_ACTION") {
    return "server_pending";
  }
  return null;
}

function prependEvent(state: BattleFlowState, eventName: string): string[] {
  return [eventName, ...state.recentEvents].slice(0, 8);
}

function parseBattleTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
