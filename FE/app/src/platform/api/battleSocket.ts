import type { BattleState } from "../../entities/game/model";
import { getWebSocketUrl } from "./client";

type BattleParticipantResponse = {
  playerId: string;
  hp: number;
  mana: number;
  cooldowns: Record<string, number>;
};

type BattleLogResponse = {
  turnNumber: number;
  message: string;
};

type BattleStateResponse = {
  battleSessionId: string;
  matchId: string;
  status: "ACTIVE" | "ENDED";
  turnNumber: number;
  turnOwnerPlayerId: string;
  self: BattleParticipantResponse;
  opponent: BattleParticipantResponse;
  battleLog: BattleLogResponse[];
  winnerPlayerId: string | null;
};

type BattleActionResultPayload = {
  battleSessionId: string;
  turnNumber: number;
  actionId: string;
  status: "ACCEPTED" | "REJECTED";
  reason: string | null;
  battle: BattleStateResponse | null;
};

type BattleMatchReadyEvent = {
  type: "battle.match_ready";
  payload: {
    queueStatus: "SEARCHING";
    queuedAt: string;
  };
};

type BattleMatchFoundEvent = {
  type: "battle.match_found";
  payload: {
    matchId: string;
    battleSessionId: string;
    playerSeat: "PLAYER_ONE" | "PLAYER_TWO";
  };
};

type BattleStartedEvent = {
  type: "battle.started";
  payload: {
    battleSessionId: string;
    playerSeat: "PLAYER_ONE" | "PLAYER_TWO";
    battle: BattleStateResponse;
  };
};

type BattleActionResultEvent = {
  type: "battle.action_result";
  requestId?: string;
  payload: BattleActionResultPayload;
};

type BattleStateUpdatedEvent = {
  type: "battle.state_updated";
  payload: {
    battleSessionId: string;
    battle: BattleStateResponse;
    sourceActionId?: string;
  };
};

type BattleEndedEvent = {
  type: "battle.ended";
  payload: {
    battleSessionId: string;
    winnerPlayerId: string;
    loserPlayerId: string;
    endedReason: string;
    battle: BattleStateResponse;
    ratingChange?: number;
  };
};

type BattleErrorEvent = {
  type: "battle.error";
  requestId?: string;
  payload: {
    code: string;
    message: string;
  };
};

export type BattleSocketEvent =
  | BattleMatchReadyEvent
  | BattleMatchFoundEvent
  | BattleStartedEvent
  | BattleActionResultEvent
  | BattleStateUpdatedEvent
  | BattleEndedEvent
  | BattleErrorEvent;

export type BattleSocketConnection = {
  close: () => void;
  sendSubmitAction: (payload: SubmitBattleActionPayload) => void;
};

export type SubmitBattleActionPayload = {
  battleSessionId: string;
  playerId: string;
  turnNumber: number;
  actionId: string;
  gestureSequence: string[];
  submittedAt: string;
  requestId: string;
};

type ConnectBattleSocketOptions = {
  token: string;
  onClose: () => void;
  onEvent: (event: BattleSocketEvent) => void;
};

export function connectBattleSocket({
  token,
  onClose,
  onEvent
}: ConnectBattleSocketOptions): Promise<BattleSocketConnection> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getWebSocketUrl(token));
    let settled = false;

    socket.addEventListener("open", () => {
      settled = true;
      resolve({
        close: () => {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
          }
        },
        sendSubmitAction: (payload) => {
          if (socket.readyState !== WebSocket.OPEN) {
            throw new Error("Battle socket is not connected.");
          }
          socket.send(
            JSON.stringify({
              type: "battle.submit_action",
              requestId: payload.requestId,
              payload: {
                battleSessionId: payload.battleSessionId,
                playerId: payload.playerId,
                turnNumber: payload.turnNumber,
                actionId: payload.actionId,
                gestureSequence: payload.gestureSequence,
                submittedAt: payload.submittedAt
              }
            })
          );
        }
      });
    });

    socket.addEventListener("message", (messageEvent) => {
      try {
        const payload = JSON.parse(String(messageEvent.data)) as { type?: string };
        if (isSupportedBattleSocketEvent(payload)) {
          onEvent(payload);
        }
      } catch {
        return;
      }
    });

    socket.addEventListener("error", () => {
      if (!settled) {
        settled = true;
        reject(new Error("Failed to connect battle socket."));
      }
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        settled = true;
        reject(new Error("Battle socket closed before it connected."));
        return;
      }
      onClose();
    });
  });
}

export function toBattleState(snapshot: BattleStateResponse): BattleState {
  return {
    battleSessionId: snapshot.battleSessionId,
    matchId: snapshot.matchId,
    status: snapshot.status,
    turnNumber: snapshot.turnNumber,
    turnOwnerPlayerId: snapshot.turnOwnerPlayerId,
    self: snapshot.self,
    opponent: snapshot.opponent,
    battleLog: snapshot.battleLog.map((entry) => ({
      turnNumber: entry.turnNumber,
      message: entry.message
    })),
    winnerPlayerId: snapshot.winnerPlayerId
  };
}

function isSupportedBattleSocketEvent(
  payload: { type?: string }
): payload is BattleSocketEvent {
  return (
    payload.type === "battle.match_ready" ||
    payload.type === "battle.match_found" ||
    payload.type === "battle.started" ||
    payload.type === "battle.action_result" ||
    payload.type === "battle.state_updated" ||
    payload.type === "battle.ended" ||
    payload.type === "battle.error"
  );
}
