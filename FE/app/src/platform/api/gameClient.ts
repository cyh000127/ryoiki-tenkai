import type {
  Animset,
  LeaderboardEntry,
  MatchHistorySummary,
  PlayerSummary,
  Skillset
} from "../../entities/game/model";
import { getApiBaseUrl } from "./client";

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
};

type GuestPlayerResponse = {
  playerId: string;
  guestToken: string;
  rating: number;
};

type PlayerProfileResponse = {
  playerId: string;
  nickname: string;
  rating: number;
  wins: number;
  losses: number;
  equippedSkillsetId: string;
  equippedAnimsetId: string;
  loadoutConfigured: boolean;
};

type LoadoutResponse = {
  playerId: string;
  equippedSkillsetId: string;
  equippedAnimsetId: string;
  loadoutConfigured: boolean;
};

export type QueueStatusResponse = {
  queueStatus: "SEARCHING" | "MATCHED" | "IDLE";
  queuedAt: string | null;
  matchId: string | null;
  battleSessionId: string | null;
};

type WsTokenResponse = {
  wsToken: string;
  expiresIn: number;
};

type SurrenderResponse = {
  battleSessionId: string;
  status: "ACTIVE" | "ENDED";
  result: "WIN" | "LOSE" | null;
  endedReason: string | null;
};

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "API_ERROR", status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  playerId?: string
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (playerId) {
    headers.set("X-Player-Id", playerId);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success || payload.data === null) {
    throw new ApiClientError(
      payload?.error?.message ?? "Request failed.",
      payload?.error?.code ?? "API_ERROR",
      response.status
    );
  }

  return payload.data;
}

export async function createGuestPlayer(nickname: string): Promise<GuestPlayerResponse> {
  return request<GuestPlayerResponse>("/api/v1/players/guest", {
    method: "POST",
    body: JSON.stringify({ nickname })
  });
}

export async function getMyProfile(playerId: string): Promise<PlayerProfileResponse> {
  return request<PlayerProfileResponse>("/api/v1/players/me", {}, playerId);
}

export async function listSkillsets(): Promise<Skillset[]> {
  return request<Skillset[]>("/api/v1/skillsets");
}

export async function listAnimsets(): Promise<Animset[]> {
  return request<Animset[]>("/api/v1/animsets");
}

export async function updateLoadout(
  playerId: string,
  skillsetId: string,
  animsetId: string
): Promise<LoadoutResponse> {
  return request<LoadoutResponse>(
    "/api/v1/players/me/loadout",
    {
      method: "POST",
      body: JSON.stringify({ skillsetId, animsetId })
    },
    playerId
  );
}

export async function enterMatchmakingQueue(playerId: string): Promise<QueueStatusResponse> {
  return request<QueueStatusResponse>(
    "/api/v1/matchmaking/queue",
    {
      method: "POST",
      body: JSON.stringify({ mode: "RANKED_1V1" })
    },
    playerId
  );
}

export async function leaveMatchmakingQueue(playerId: string): Promise<QueueStatusResponse> {
  return request<QueueStatusResponse>(
    "/api/v1/matchmaking/queue",
    {
      method: "DELETE"
    },
    playerId
  );
}

export async function getWsToken(playerId: string): Promise<WsTokenResponse> {
  return request<WsTokenResponse>("/api/v1/ws-token", {}, playerId);
}

export async function surrenderBattle(
  battleSessionId: string,
  playerId: string
): Promise<SurrenderResponse> {
  return request<SurrenderResponse>(
    `/api/v1/battles/${battleSessionId}/surrender`,
    {
      method: "POST"
    },
    playerId
  );
}

export async function listMatchHistory(playerId: string): Promise<MatchHistorySummary[]> {
  return request<MatchHistorySummary[]>("/api/v1/matches/history", {}, playerId);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>("/api/v1/ratings/leaderboard");
}

export function toPlayerSummary(profile: PlayerProfileResponse): PlayerSummary {
  return {
    playerId: profile.playerId,
    nickname: profile.nickname,
    rating: profile.rating,
    wins: profile.wins,
    losses: profile.losses
  };
}
