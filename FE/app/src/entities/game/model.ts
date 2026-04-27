export type Skill = {
  skillId: string;
  name: string;
  gestureSequence: string[];
  manaCost: number;
  damage: number;
  cooldownTurn: number;
};

export type Skillset = {
  skillsetId: string;
  name: string;
  skills: Skill[];
};

export type Animset = {
  animsetId: string;
  name: string;
};

export type PlayerSummary = {
  playerId: string;
  nickname: string;
  rating: number;
  wins: number;
  losses: number;
};

export type FighterState = {
  playerId: string;
  hp: number;
  mana: number;
  cooldowns: Record<string, number>;
};

export type BattleLogItem = {
  turnNumber: number;
  message: string;
};

export type BattleState = {
  battleSessionId: string;
  matchId: string;
  status: "ACTIVE" | "ENDED";
  turnNumber: number;
  turnOwnerPlayerId: string;
  actionDeadlineAt?: string;
  self: FighterState;
  opponent: FighterState;
  battleLog: BattleLogItem[];
  winnerPlayerId: string | null;
  loserPlayerId?: string | null;
  endedReason?: "HP_ZERO" | "SURRENDER" | "TIMEOUT" | "DISCONNECT" | null;
};

export type MatchRecord = {
  matchId: string;
  result: "WIN" | "LOSE";
  ratingChange: number;
  turnCount: number;
};

export const DEFAULT_SKILLSET: Skillset = {
  skillsetId: "skillset_seal_basic",
  name: "기본 인장술",
  skills: [
    {
      skillId: "pulse_strike",
      name: "파동격",
      gestureSequence: ["seal_1", "seal_3"],
      manaCost: 20,
      damage: 25,
      cooldownTurn: 1
    },
    {
      skillId: "burst_edge",
      name: "쇄도참",
      gestureSequence: ["seal_2", "hold_300", "seal_4"],
      manaCost: 30,
      damage: 35,
      cooldownTurn: 2
    },
    {
      skillId: "focus_bolt",
      name: "집중탄",
      gestureSequence: ["open_palm", "seal_5"],
      manaCost: 15,
      damage: 18,
      cooldownTurn: 1
    }
  ]
};

export const DEFAULT_ANIMSETS: Animset[] = [
  { animsetId: "animset_basic_2d", name: "기본 2D 연출" },
  { animsetId: "animset_impact_2d", name: "타격 강조 연출" }
];
