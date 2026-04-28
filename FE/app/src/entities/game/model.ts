export type Skill = {
  skillId: string;
  name: string;
  description: string;
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
      skillId: "jjk_gojo_red",
      name: "赫",
      description: "한국어명: 혁. 문서 기준 고죠 사토루 무하한주술의 밀어내는 폭발 피해.",
      gestureSequence: ["index_up"],
      manaCost: 20,
      damage: 24,
      cooldownTurn: 1
    },
    {
      skillId: "jjk_gojo_hollow_purple",
      name: "虚式「茈」",
      description: "한국어명: 허식 자. 문서 기준 고죠 사토루 무하한주술의 고비용 직선형 큰 피해.",
      gestureSequence: ["pinch", "blue_orb", "red_orb", "orb_collision"],
      manaCost: 55,
      damage: 55,
      cooldownTurn: 3
    },
    {
      skillId: "jjk_gojo_infinite_void",
      name: "領域展開「無量空処」",
      description: "한국어명: 무량공처. 문서 기준 무한 정보 과부하로 상대 입력을 정지시키는 제어형 영역.",
      gestureSequence: ["two_finger_cross", "domain_seal"],
      manaCost: 60,
      damage: 40,
      cooldownTurn: 4
    },
    {
      skillId: "jjk_sukuna_malevolent_shrine",
      name: "領域展開「伏魔御厨子」",
      description: "한국어명: 복마어주자. 문서 기준 열린 영역 안에서 범위 절단 피해를 주는 공격형 영역.",
      gestureSequence: ["flat_prayer", "domain_seal"],
      manaCost: 60,
      damage: 50,
      cooldownTurn: 4
    },
    {
      skillId: "jjk_megumi_chimera_shadow_garden",
      name: "領域展開「嵌合暗翳庭」",
      description: "한국어명: 감합암예정. 문서 기준 그림자 바다와 식신 소환을 강화하는 영역.",
      gestureSequence: ["shadow_seal", "domain_seal"],
      manaCost: 55,
      damage: 42,
      cooldownTurn: 4
    }
  ]
};

export const DEFAULT_ANIMSETS: Animset[] = [
  { animsetId: "animset_basic_2d", name: "기본 2D 연출" },
  { animsetId: "animset_impact_2d", name: "타격 강조 연출" },
  { animsetId: "animset_unity_jjk", name: "Unity WebGL 프로토타입" }
];
