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

export type BattleSocketEvent =
  | BattleMatchReadyEvent
  | BattleMatchFoundEvent
  | BattleStartedEvent;

export type BattleSocketConnection = {
  close: () => void;
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
    payload.type === "battle.started"
  );
}
