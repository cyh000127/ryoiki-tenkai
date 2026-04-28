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

export type MatchResult = "WIN" | "LOSE";

export type MatchRecord = {
  matchId: string;
  result: MatchResult;
  ratingChange: number;
  turnCount: number;
};

export type MatchHistorySummary = {
  matchId: string;
  battleSessionId: string;
  result: MatchResult;
  skillsetId: string;
  ratingChange: number;
  ratingAfter: number;
  endedReason: "HP_ZERO" | "SURRENDER" | "TIMEOUT" | "DISCONNECT";
  turnCount: number;
  playedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  nickname: string;
  rating: number;
};

export const DEFAULT_SKILLSET: Skillset = {
  skillsetId: "skillset_seal_basic",
  name: "주술회전 Phase 1 술식",
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
    },
    {
      skillId: "jjk_gojo_red",
      name: "赫",
      gestureSequence: ["index_up"],
      manaCost: 20,
      damage: 24,
      cooldownTurn: 1
    },
    {
      skillId: "jjk_gojo_hollow_purple",
      name: "虚式「茈」",
      gestureSequence: ["pinch", "blue_orb", "red_orb", "orb_collision"],
      manaCost: 55,
      damage: 55,
      cooldownTurn: 3
    },
    {
      skillId: "jjk_gojo_infinite_void",
      name: "領域展開「無量空処」",
      gestureSequence: ["two_finger_cross", "domain_seal"],
      manaCost: 60,
      damage: 40,
      cooldownTurn: 4
    },
    {
      skillId: "jjk_sukuna_malevolent_shrine",
      name: "領域展開「伏魔御厨子」",
      gestureSequence: ["flat_prayer", "domain_seal"],
      manaCost: 60,
      damage: 50,
      cooldownTurn: 4
    },
    {
      skillId: "jjk_megumi_chimera_shadow_garden",
      name: "領域展開「嵌合暗翳庭」",
      gestureSequence: ["shadow_seal", "domain_seal"],
      manaCost: 55,
      damage: 42,
      cooldownTurn: 4
    }
  ]
};

export const DEFAULT_ANIMSETS: Animset[] = [
  { animsetId: "animset_basic_2d", name: "기본 2D 연출" },
  { animsetId: "animset_impact_2d", name: "타격 강조 연출" }
];
