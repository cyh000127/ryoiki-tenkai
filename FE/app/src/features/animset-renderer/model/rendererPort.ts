export type AnimsetRendererKind = "html-fallback" | "unity-webgl";
export type RendererScene = "practice" | "battle" | "result";
export type RendererStatus = "idle" | "loading" | "ready" | "error";

export type RendererFallbackPolicy = "html-fallback";

export type RendererMountOptions = {
  animsetId: string;
  buildConfigUrl?: string;
  buildVersion: string;
  bridgeMethod?: string;
  bridgeTarget?: string;
  fallbackPolicy: RendererFallbackPolicy;
  onBridgeEvent?: (event: AnimsetRendererBridgeEvent) => void;
  rendererKind: AnimsetRendererKind;
  scene: RendererScene;
};

export type RendererSkillPresentationPayload = {
  animsetId: string;
  cameraPresetId?: string;
  clipId?: string;
  fallbackMode: "html-only" | "poster" | "video" | "unity";
  impactVfxId?: string;
  skillId: string;
  tier: "hero" | "standard" | "experimental";
  timelineId: string;
};

export type RendererParticipantProjection = {
  cooldowns: Record<string, number>;
  hp: number;
  mana: number;
  playerId: string;
};

export type RendererBootstrapEvent = {
  payload: {
    animsetId: string;
    opponentId?: string | null;
    playerId: string;
    scene: RendererScene;
  };
  type: "renderer.bootstrap";
};

export type PracticeSkillSelectedEvent = {
  payload: {
    gestureSequence: string[];
    presentation: RendererSkillPresentationPayload;
    skillId: string;
    skillName: string;
  };
  type: "practice.skill_selected";
};

export type PracticeProgressUpdatedEvent = {
  payload: {
    completedRounds: number;
    confidence: number;
    currentStep: number;
    expectedToken: string | null;
    handDetected: boolean;
    observedToken: string | null;
    progressPercent: number;
    status: "idle" | "running" | "blocked" | "complete";
    targetLength: number;
  };
  type: "practice.progress_updated";
};

export type PracticeCompletedEvent = {
  payload: {
    completedAtMs: number;
    completedRounds: number;
    skillId: string;
  };
  type: "practice.completed";
};

export type BattleStateSnapshotEvent = {
  payload: {
    actionDeadlineAt?: string | null;
    battleSessionId: string;
    matchId: string;
    opponent: RendererParticipantProjection;
    presentation: RendererSkillPresentationPayload;
    selectedSkillId: string;
    selectedSkillName: string;
    self: RendererParticipantProjection;
    status: "ACTIVE" | "ENDED";
    turnNumber: number;
    turnOwnerPlayerId: string;
  };
  type: "battle.state_snapshot";
};

export type BattleActionResolvedEvent = {
  payload: {
    actionId: string;
    actorPlayerId: string;
    presentation?: RendererSkillPresentationPayload;
    reason?: string | null;
    result: "accepted" | "pending" | "rejected";
    skillId?: string | null;
    skillName?: string | null;
  };
  type: "battle.action_resolved";
};

export type BattleEndedEvent = {
  payload: {
    battleSessionId: string;
    endedReason: "DISCONNECT" | "HP_ZERO" | "SURRENDER" | "TIMEOUT" | null;
    loserPlayerId?: string | null;
    ratingChange: number | null;
    resultForPlayer: "LOSE" | "WIN" | null;
    winnerPlayerId: string | null;
  };
  type: "battle.ended";
};

export type RendererEventEnvelope =
  | BattleActionResolvedEvent
  | BattleEndedEvent
  | BattleStateSnapshotEvent
  | PracticeCompletedEvent
  | PracticeProgressUpdatedEvent
  | PracticeSkillSelectedEvent
  | RendererBootstrapEvent;

export type AnimsetRendererBridgeEvent =
  | { type: "renderer.ready" }
  | { payload: { message: string }; type: "renderer.error" }
  | {
      payload: {
        animsetId: string;
        skillId: string;
      };
      type: "renderer.asset_missing";
    }
  | {
      payload: {
        scene: RendererScene;
        timelineId: string;
      };
      type: "renderer.timeline_complete";
    };

export type AnimsetRendererPort = {
  getStatus: () => RendererStatus;
  mount: (target: HTMLElement, options: RendererMountOptions) => Promise<void>;
  unmount: () => Promise<void> | void;
  update: (event: RendererEventEnvelope) => void;
};
