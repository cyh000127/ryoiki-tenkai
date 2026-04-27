import {
  DEFAULT_ANIMSETS,
  DEFAULT_SKILLSET,
  type BattleState,
  type MatchRecord,
  type PlayerSummary,
  type Skill
} from "../../../entities/game/model";

export type ScreenKey = "home" | "loadout" | "matchmaking" | "battle" | "result" | "history";

export type InputFailureReason =
  | "confidence_low"
  | "sequence_mismatch"
  | "sequence_incomplete"
  | "not_your_turn"
  | "insufficient_mana"
  | "server_pending";

export type ServerConfirmationStatus = "IDLE" | "PENDING" | "CONFIRMED";

export type InputFeedback = {
  cameraReady: boolean;
  handDetected: boolean;
  currentGesture: string | null;
  targetSequence: string[];
  currentStep: number;
  failureReason: InputFailureReason | null;
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
  | { type: "equip"; skillsetId: string; animsetId: string; skillId: string }
  | { type: "startQueue" }
  | { type: "matchFound" }
  | { type: "selectSkill"; skillId: string }
  | { type: "simulateGestureStep"; gesture: string; confidence: number }
  | { type: "submitSkill" }
  | { type: "confirmSkill" }
  | { type: "resolveOpponentTurn" }
  | { type: "surrender" }
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
    currentGesture: null,
    targetSequence: DEFAULT_SKILLSET.skills[0].gestureSequence,
    currentStep: 0,
    failureReason: null,
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
    case "equip":
      return {
        ...state,
        equippedSkillsetId: action.skillsetId,
        equippedAnimsetId: action.animsetId,
        selectedSkillId: action.skillId,
        input: {
          ...state.input,
          targetSequence: findSkill(action.skillId).gestureSequence,
          currentStep: 0,
          failureReason: null,
          serverConfirmationStatus: "IDLE"
        },
        screen: "matchmaking",
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
    case "matchFound":
      return {
        ...state,
        screen: "battle",
        queueStatus: "MATCHED",
        socketStatus: "CONNECTED",
        battle: createInitialBattle(state.player.playerId),
        input: {
          ...state.input,
          cameraReady: true,
          handDetected: true,
          currentStep: 0,
          failureReason: null,
          networkLatencyMs: 42,
          serverConfirmationStatus: "IDLE"
        },
        recentEvents: prependEvent(state, "match.found")
      };
    case "selectSkill":
      return {
        ...state,
        selectedSkillId: action.skillId,
        input: {
          ...state.input,
          targetSequence: findSkill(action.skillId).gestureSequence,
          currentStep: 0,
          currentGesture: null,
          failureReason: null,
          serverConfirmationStatus: "IDLE"
        }
      };
    case "simulateGestureStep":
      return applyGestureStep(state, action.gesture, action.confidence);
    case "submitSkill":
      return submitSelectedSkill(state);
    case "confirmSkill":
      return confirmSelectedSkill(state);
    case "resolveOpponentTurn":
      return resolveOpponentTurn(state);
    case "surrender":
      return finishBattle(state, false, "battle.ended.surrender");
    case "resetBattle":
      return {
        ...state,
        screen: "home",
        queueStatus: "IDLE",
        socketStatus: "DISCONNECTED",
        battle: null,
        input: initialBattleFlowState.input,
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
  confidence: number
): BattleFlowState {
  if (state.input.serverConfirmationStatus === "PENDING") {
    return {
      ...state,
      input: {
        ...state.input,
        failureReason: "server_pending"
      },
      recentEvents: prependEvent(state, "gesture.rejected")
    };
  }
  if (state.battle && state.battle.turnOwnerPlayerId !== state.player.playerId) {
    return {
      ...state,
      input: {
        ...state.input,
        failureReason: "not_your_turn"
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
        currentGesture: gesture,
        confidence,
        failureReason: "confidence_low",
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
        currentGesture: gesture,
        confidence,
        currentStep: 0,
        failureReason: "sequence_mismatch",
        serverConfirmationStatus: "IDLE"
      },
      recentEvents: prependEvent(state, "gesture.sequence_reset")
    };
  }
  return {
    ...state,
    input: {
      ...state.input,
      currentGesture: gesture,
      confidence,
      currentStep: state.input.currentStep + 1,
      failureReason: null,
      serverConfirmationStatus: "IDLE"
    },
    recentEvents: prependEvent(state, "gesture.step.accepted")
  };
}

function submitSelectedSkill(state: BattleFlowState): BattleFlowState {
  if (!state.battle || state.battle.status !== "ACTIVE") {
    return state;
  }
  if (state.input.serverConfirmationStatus === "PENDING") {
    return {
      ...state,
      input: { ...state.input, failureReason: "server_pending" },
      recentEvents: prependEvent(state, "battle.action_rejected")
    };
  }
  const skill = findSkill(state.selectedSkillId);
  if (state.battle.turnOwnerPlayerId !== state.player.playerId) {
    return {
      ...state,
      input: { ...state.input, failureReason: "not_your_turn" },
      recentEvents: prependEvent(state, "battle.action_rejected")
    };
  }
  if (state.input.currentStep < skill.gestureSequence.length) {
    return {
      ...state,
      input: { ...state.input, failureReason: "sequence_incomplete" },
      recentEvents: prependEvent(state, "battle.action_rejected")
    };
  }
  if (state.battle.self.mana < skill.manaCost) {
    return {
      ...state,
      input: { ...state.input, failureReason: "insufficient_mana" },
      recentEvents: prependEvent(state, "battle.action_rejected")
    };
  }

  return {
    ...state,
    input: {
      ...state.input,
      failureReason: null,
      networkLatencyMs: 64,
      serverConfirmationStatus: "PENDING"
    },
    recentEvents: prependEvent(state, "battle.action_submitted")
  };
}

function confirmSelectedSkill(state: BattleFlowState): BattleFlowState {
  if (
    !state.battle ||
    state.battle.status !== "ACTIVE" ||
    state.input.serverConfirmationStatus !== "PENDING"
  ) {
    return state;
  }

  const skill = findSkill(state.selectedSkillId);
  const nextOpponentHp = Math.max(0, state.battle.opponent.hp - skill.damage);
  const ended = nextOpponentHp <= 0;
  const battle: BattleState = {
    ...state.battle,
    status: ended ? "ENDED" : "ACTIVE",
    turnNumber: state.battle.turnNumber + 1,
    turnOwnerPlayerId: ended ? state.player.playerId : state.battle.opponent.playerId,
    self: {
      ...state.battle.self,
      mana: state.battle.self.mana - skill.manaCost,
      cooldowns: {
        ...state.battle.self.cooldowns,
        [skill.skillId]: skill.cooldownTurn
      }
    },
    opponent: {
      ...state.battle.opponent,
      hp: nextOpponentHp
    },
    battleLog: [
      {
        turnNumber: state.battle.turnNumber,
        message: `${skill.name} / ${skill.damage}`
      },
      ...state.battle.battleLog
    ],
    winnerPlayerId: ended ? state.player.playerId : null
  };

  if (ended) {
    return finishBattle({ ...state, battle }, true, "battle.ended.hp_zero");
  }

  return {
    ...state,
    battle,
    input: {
      ...state.input,
      currentStep: 0,
      currentGesture: null,
      failureReason: null,
      networkLatencyMs: 38,
      serverConfirmationStatus: "CONFIRMED"
    },
    recentEvents: prependEvent(state, "battle.state_updated")
  };
}

function resolveOpponentTurn(state: BattleFlowState): BattleFlowState {
  if (
    !state.battle ||
    state.battle.status !== "ACTIVE" ||
    state.battle.turnOwnerPlayerId === state.player.playerId ||
    state.input.serverConfirmationStatus === "PENDING"
  ) {
    return state;
  }

  const opponentDamage = 12;
  const nextSelfHp = Math.max(0, state.battle.self.hp - opponentDamage);
  const ended = nextSelfHp <= 0;
  const battle: BattleState = {
    ...state.battle,
    status: ended ? "ENDED" : "ACTIVE",
    turnNumber: state.battle.turnNumber + 1,
    turnOwnerPlayerId: ended ? state.battle.opponent.playerId : state.player.playerId,
    self: {
      ...state.battle.self,
      hp: nextSelfHp
    },
    battleLog: [
      {
        turnNumber: state.battle.turnNumber,
        message: `opponent_action / ${opponentDamage}`
      },
      ...state.battle.battleLog
    ],
    winnerPlayerId: ended ? state.battle.opponent.playerId : null
  };

  if (ended) {
    return finishBattle({ ...state, battle }, false, "battle.ended.hp_zero");
  }

  return {
    ...state,
    battle,
    input: {
      ...state.input,
      currentStep: 0,
      currentGesture: null,
      failureReason: null,
      networkLatencyMs: 46,
      serverConfirmationStatus: "IDLE"
    },
    recentEvents: prependEvent(state, "battle.turn_ready")
  };
}

function createInitialBattle(playerId: string): BattleState {
  return {
    battleSessionId: "battle_local",
    matchId: "match_local",
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

function finishBattle(
  state: BattleFlowState,
  didWin: boolean,
  eventName: string
): BattleFlowState {
  const ratingChange = didWin ? 18 : -18;
  const battle = state.battle
    ? {
        ...state.battle,
        status: "ENDED" as const,
        winnerPlayerId: didWin ? state.player.playerId : state.battle.opponent.playerId
      }
    : null;
  return {
    ...state,
    screen: "result",
    battle,
    player: {
      ...state.player,
      rating: state.player.rating + ratingChange,
      wins: state.player.wins + (didWin ? 1 : 0),
      losses: state.player.losses + (didWin ? 0 : 1)
    },
    input: {
      ...state.input,
      currentStep: 0,
      currentGesture: null,
      failureReason: null,
      serverConfirmationStatus:
        state.input.serverConfirmationStatus === "PENDING"
          ? "CONFIRMED"
          : state.input.serverConfirmationStatus
    },
    history: [
      {
        matchId: state.battle?.matchId ?? "match_local",
        result: didWin ? "WIN" : "LOSE",
        ratingChange,
        turnCount: state.battle?.turnNumber ?? 0
      },
      ...state.history
    ],
    recentEvents: prependEvent(state, eventName)
  };
}

function prependEvent(state: BattleFlowState, eventName: string): string[] {
  return [eventName, ...state.recentEvents].slice(0, 8);
}
