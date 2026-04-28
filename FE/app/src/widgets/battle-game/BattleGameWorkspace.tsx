import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";

import {
  DEFAULT_ANIMSETS,
  DEFAULT_SKILLSET,
  type BattleState,
  type Skill,
  type Skillset
} from "../../entities/game/model";
import {
  battleFlowReducer,
  findSkill,
  getSubmitFailureReason,
  initialBattleFlowState,
  shouldIgnoreIncomingBattleSnapshot,
  type BattleFlowState,
  type InputFailureReason,
  type ServerConfirmationStatus,
  type ScreenKey
} from "../../features/battle-flow/model/battleFlow";
import type { RendererEventEnvelope } from "../../features/animset-renderer/model/rendererPort";
import { AnimsetRendererSurface } from "../../features/animset-renderer/ui/AnimsetRendererSurface";
import {
  DEBUG_FALLBACK_ENABLED,
  createDebugFallbackInput,
  createDeterministicFallbackSequence,
  createLiveCameraInput,
  type GestureInputSource
} from "../../features/gesture-session/model/gestureInput";
import {
  LIVE_GESTURE_MIN_CONFIDENCE,
  createBrowserLiveGestureRecognizer,
  type LiveGestureLandmark,
  type LiveGestureObservation,
  type LiveGestureRecognizer,
  type LiveGestureRecognizerStatus
} from "../../features/gesture-session/model/liveGestureRecognizer";
import {
  JAPANESE_STARTUP_COMMANDS,
  createJapaneseStartupVoiceCommandRecognizer,
  type StartupVoiceCommandRecognizer,
  type StartupVoiceRecognitionStatus
} from "../../features/gesture-session/model/startupVoiceCommand";
import { resolveSkillPresentationEntry } from "../../features/skill-presentation/model/skillPresentationManifest";
import {
  connectBattleSocket,
  toBattleState,
  type BattleSocketConnection,
  type BattleSocketEvent
} from "../../platform/api/battleSocket";
import {
  ApiClientError,
  createGuestPlayer,
  enterMatchmakingQueue,
  getLeaderboard,
  getMyProfile,
  getWsToken,
  leaveMatchmakingQueue,
  listAnimsets,
  listMatchHistory,
  listSkillsets,
  surrenderBattle,
  toPlayerSummary,
  updateLoadout
} from "../../platform/api/gameClient";
import {
  clearPlayerSession,
  loadStoredPlayerSession,
  savePlayerSession,
  type PlayerSession
} from "../../platform/api/playerSession";
import { copy } from "../../platform/i18n/catalog";
import { Button } from "../../platform/ui/Button";
import { StatusBadge } from "../../platform/ui/StatusBadge";
import { formatLatency } from "../../shared/time/formatLatency";

const navigationScreenOrder: ScreenKey[] = ["home", "loadout", "practice", "history"];
const PRACTICE_AUTO_ADVANCE_DELAY_MS = 650;

type SkillInputMode = "gesture_only" | "voice_then_gesture";

type PracticeProgress = {
  targetSequence: string[];
  currentStep: number;
  completedRounds: number;
  confidence: number;
  handDetected: boolean;
  currentGesture: string | null;
};

type PendingAction = {
  actionId: string;
  requestId: string;
  submittedAtMs: number;
};

type HomeAction = {
  actionLabel: string;
  actionVariant: "default" | "primary";
  description: string;
  onClick: () => void;
};

type MatchProgressStep = {
  label: string;
  state: "done" | "active" | "pending";
};

type RendererActionProjection = {
  actionId: string;
  actorPlayerId: string;
  reason: string | null;
  result: "accepted" | "pending" | "rejected";
  skillId: string | null;
  skillName: string | null;
};

export function BattleGameWorkspace() {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(battleFlowReducer, initialBattleFlowState);
  const stateRef = useRef(state);
  const skillInputGateRef = useRef<{ armed: boolean; mode: SkillInputMode }>({
    armed: false,
    mode: "gesture_only"
  });
  const socketConnectionRef = useRef<BattleSocketConnection | null>(null);
  const liveRecognizerRef = useRef<LiveGestureRecognizer | null>(null);
  const practiceRecognizerRef = useRef<LiveGestureRecognizer | null>(null);
  const practiceVideoRef = useRef<HTMLVideoElement | null>(null);
  const practiceMeshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const practiceAutoAdvanceRef = useRef<{
    key: string;
    timeoutId: number | null;
  } | null>(null);
  const practiceHeldGestureRef = useRef<string | null>(null);
  const startupVoiceRecognizerRef = useRef<StartupVoiceCommandRecognizer | null>(null);
  const skillVoiceRecognizerRef = useRef<StartupVoiceCommandRecognizer | null>(null);
  const liveInputHoldTokenRef = useRef<string | null>(null);
  const practiceProgressRef = useRef<PracticeProgress>({
    targetSequence: DEFAULT_SKILLSET.skills[0].gestureSequence,
    currentStep: 0,
    completedRounds: 0,
    confidence: 0,
    handDetected: false,
    currentGesture: null
  });
  const pendingActionRef = useRef<PendingAction | null>(null);
  const reconnectInFlightRef = useRef(false);
  const ignoreSocketCloseRef = useRef(false);
  const [nicknameDraft, setNicknameDraft] = useState("local_player");
  const [session, setSession] = useState<PlayerSession | null>(() => loadStoredPlayerSession());
  const [draftSkillsetId, setDraftSkillsetId] = useState(initialBattleFlowState.equippedSkillsetId);
  const [draftSkillId, setDraftSkillId] = useState(initialBattleFlowState.selectedSkillId);
  const [selectedAnimsetId, setSelectedAnimsetId] = useState(initialBattleFlowState.equippedAnimsetId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [liveRecognizerStatus, setLiveRecognizerStatus] =
    useState<LiveGestureRecognizerStatus>("idle");
  const [liveObservation, setLiveObservation] = useState<LiveGestureObservation | null>(null);
  const [practiceRecognizerStatus, setPracticeRecognizerStatus] =
    useState<LiveGestureRecognizerStatus>("idle");
  const [practiceObservation, setPracticeObservation] =
    useState<LiveGestureObservation | null>(null);
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress>(
    practiceProgressRef.current
  );
  const [practiceCompletedAtMs, setPracticeCompletedAtMs] = useState<number | null>(null);
  const [battleRendererAction, setBattleRendererAction] =
    useState<RendererActionProjection | null>(null);
  const [startupVoiceStatus, setStartupVoiceStatus] =
    useState<StartupVoiceRecognitionStatus>("idle");
  const [startupVoiceTranscript, setStartupVoiceTranscript] = useState("");
  const [startupVoiceMatchedCommand, setStartupVoiceMatchedCommand] = useState<string | null>(null);
  const [skillInputMode, setSkillInputMode] = useState<SkillInputMode>("gesture_only");
  const [skillVoiceStatus, setSkillVoiceStatus] =
    useState<StartupVoiceRecognitionStatus>("idle");
  const [skillVoiceTranscript, setSkillVoiceTranscript] = useState("");
  const [skillVoiceMatchedCommand, setSkillVoiceMatchedCommand] = useState<string | null>(null);
  const [skillVoiceArmed, setSkillVoiceArmed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const debugFallbackEnabled = DEBUG_FALLBACK_ENABLED;

  const skillsetsQuery = useQuery({
    queryKey: ["skillsets"],
    queryFn: listSkillsets
  });
  const animsetsQuery = useQuery({
    queryKey: ["animsets"],
    queryFn: listAnimsets
  });
  const profileQuery = useQuery({
    queryKey: ["playerProfile", session?.playerId],
    enabled: session !== null,
    queryFn: () => getMyProfile(session!.playerId),
    retry: false
  });
  const historyQuery = useQuery({
    queryKey: ["matchHistory", session?.playerId],
    enabled: session !== null && state.screen === "history",
    queryFn: () => listMatchHistory(session!.playerId),
    retry: false
  });
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    enabled: session !== null && state.screen === "history",
    queryFn: getLeaderboard,
    retry: false
  });

  const skillsets = skillsetsQuery.data?.length ? skillsetsQuery.data : [DEFAULT_SKILLSET];
  const animsets = animsetsQuery.data?.length ? animsetsQuery.data : DEFAULT_ANIMSETS;
  const equippedSkillset =
    skillsets.find((skillset) => skillset.skillsetId === state.equippedSkillsetId) ?? skillsets[0];
  const equippedSkill =
    equippedSkillset.skills.find((skill) => skill.skillId === state.selectedSkillId) ??
    equippedSkillset.skills[0] ??
    findSkill(state.selectedSkillId);
  const activeSkillset =
    skillsets.find((skillset) => skillset.skillsetId === draftSkillsetId) ?? skillsets[0];
  const selectedSkill =
    activeSkillset.skills.find((skill) => skill.skillId === draftSkillId) ??
    activeSkillset.skills[0] ??
    equippedSkill;

  const createGuestMutation = useMutation({
    mutationFn: createGuestPlayer,
    onSuccess: (guest) => {
      const nextSession = {
        playerId: guest.playerId,
        guestToken: guest.guestToken
      };
      savePlayerSession(nextSession);
      setSession(nextSession);
      dispatch({ type: "createGuest", nickname: nicknameDraft.trim() || state.player.nickname });
      dispatch({ type: "go", screen: "loadout" });
      setStatusMessage(null);
    },
    onError: () => {
      setStatusMessage(copy.playerCreateFailed);
    }
  });

  const saveLoadoutMutation = useMutation({
    mutationFn: (payload: { playerId: string; skillsetId: string; animsetId: string }) =>
      updateLoadout(payload.playerId, payload.skillsetId, payload.animsetId),
    onSuccess: async (loadout) => {
      dispatch({
        type: "equip",
        skillsetId: loadout.equippedSkillsetId,
        animsetId: loadout.equippedAnimsetId,
        skillId: selectedSkill.skillId
      });
      dispatch({ type: "go", screen: "home" });
      setSelectedAnimsetId(loadout.equippedAnimsetId);
      setStatusMessage(copy.loadoutSaved);
      await queryClient.invalidateQueries({
        queryKey: ["playerProfile", loadout.playerId]
      });
    },
    onError: () => {
      setStatusMessage(copy.loadoutSaveFailed);
    }
  });

  const startQueueMutation = useMutation({
    mutationFn: async (playerId: string) => {
      await ensureBattleSocketConnection(playerId);
      return enterMatchmakingQueue(playerId);
    },
    onSuccess: () => {
      setStatusMessage(null);
    },
    onError: () => {
      closeBattleSocket(true);
      dispatch({ type: "leaveQueue" });
      setStatusMessage(copy.queueJoinFailed);
    }
  });

  const cancelQueueMutation = useMutation({
    mutationFn: leaveMatchmakingQueue,
    onSuccess: (queueStatus) => {
      if (queueStatus.queueStatus === "IDLE") {
        closeBattleSocket(true);
        dispatch({ type: "leaveQueue" });
        setStatusMessage(copy.queueCanceled);
      }
    },
    onError: () => {
      setStatusMessage(copy.queueCancelFailed);
    }
  });

  const surrenderMutation = useMutation({
    mutationFn: async (payload: { battleSessionId: string; playerId: string }) =>
      surrenderBattle(payload.battleSessionId, payload.playerId),
    onSuccess: () => {
      setStatusMessage(null);
    },
    onError: () => {
      setStatusMessage(copy.surrenderFailed);
    }
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    skillInputGateRef.current = {
      armed: skillVoiceArmed,
      mode: skillInputMode
    };
  }, [skillInputMode, skillVoiceArmed]);

  useEffect(() => {
    resetPracticeProgress(selectedSkill);
  }, [selectedSkill.skillId]);

  useEffect(() => {
    return () => {
      closeBattleSocket(true);
      liveRecognizerRef.current?.stop();
      liveRecognizerRef.current = null;
      practiceRecognizerRef.current?.stop();
      practiceRecognizerRef.current = null;
      clearPracticeAutoAdvance();
      startupVoiceRecognizerRef.current?.stop();
      startupVoiceRecognizerRef.current = null;
      skillVoiceRecognizerRef.current?.stop();
      skillVoiceRecognizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.screen !== "practice") {
      stopPracticeRecognizer();
    }
  }, [state.screen]);

  useEffect(() => {
    drawHandMeshOverlay(
      practiceMeshCanvasRef.current,
      practiceRecognizerStatus === "ready"
        ? practiceObservation?.handLandmarks ?? []
        : []
    );
  }, [practiceObservation, practiceRecognizerStatus]);

  useEffect(() => {
    if (state.screen === "battle" && state.battle?.status === "ACTIVE") {
      return;
    }

    stopLiveRecognizer();
  }, [state.battle?.status, state.screen]);

  useEffect(() => {
    if (state.screen !== "battle" || state.battle?.status !== "ACTIVE") {
      return;
    }

    if (!isVoiceActivatedSkill(findSkill(state.selectedSkillId))) {
      return;
    }

    setSkillInputMode("voice_then_gesture");
    setSkillVoiceArmed(false);
    setSkillVoiceStatus("idle");
    setSkillVoiceTranscript("");
    setSkillVoiceMatchedCommand(null);
  }, [state.battle?.status, state.screen, state.selectedSkillId]);

  useEffect(() => {
    const activeBattle =
      state.screen === "battle" && state.battle?.status === "ACTIVE" ? state.battle : null;
    const isActionWindowOpen =
      activeBattle !== null &&
      activeBattle.turnOwnerPlayerId === state.player.playerId &&
      state.input.serverConfirmationStatus !== "PENDING";

    if (
      !isActionWindowOpen ||
      skillInputMode !== "voice_then_gesture" ||
      skillVoiceArmed
    ) {
      stopSkillVoiceRecognizer();
      return;
    }

    if (skillVoiceRecognizerRef.current || skillVoiceStatus === "listening") {
      return;
    }

    if (
      skillVoiceStatus === "blocked" ||
      skillVoiceStatus === "unsupported" ||
      skillVoiceStatus === "error"
    ) {
      return;
    }

    void handleStartSkillVoiceGate(true);
  }, [
    skillInputMode,
    skillVoiceArmed,
    skillVoiceStatus,
    state.battle?.status,
    state.battle?.turnOwnerPlayerId,
    state.input.serverConfirmationStatus,
    state.player.playerId,
    state.screen
  ]);

  useEffect(() => {
    if (state.screen !== "battle" || state.battle?.status !== "ACTIVE") {
      return;
    }

    if (skillInputMode !== "voice_then_gesture") {
      return;
    }

    if (liveRecognizerRef.current || liveRecognizerStatus === "starting" || liveRecognizerStatus === "ready") {
      return;
    }

    if (
      liveRecognizerStatus === "blocked" ||
      liveRecognizerStatus === "unsupported" ||
      liveRecognizerStatus === "error"
    ) {
      return;
    }

    void handleStartLiveRecognizer();
  }, [liveRecognizerStatus, skillInputMode, state.battle?.status, state.screen]);

  useEffect(() => {
    if (state.socketStatus === "DISCONNECTED" && socketConnectionRef.current) {
      closeBattleSocket(true);
    }
  }, [state.socketStatus]);

  useEffect(() => {
    if (!session || state.socketStatus !== "DISCONNECTED" || state.battle?.status !== "ACTIVE") {
      return;
    }
    if (reconnectInFlightRef.current) {
      return;
    }

    dispatch({ type: "socketReconnecting" });
    setStatusMessage(copy.socketReconnecting);
    void reconnectBattleSocket(session.playerId);
  }, [session, state.battle?.status, state.socketStatus]);

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    dispatch({
      type: "hydratePlayer",
      player: toPlayerSummary(profileQuery.data)
    });

    const restoredSkillset =
      skillsets.find((skillset) => skillset.skillsetId === profileQuery.data.equippedSkillsetId) ??
      skillsets[0];
    const restoredSkill =
      restoredSkillset?.skills.find(
        (skill) => skill.skillId === stateRef.current.selectedSkillId
      ) ??
      restoredSkillset?.skills[0] ??
      DEFAULT_SKILLSET.skills[0];

    dispatch({
      type: "hydrateLoadout",
      skillsetId: profileQuery.data.equippedSkillsetId,
      animsetId: profileQuery.data.equippedAnimsetId,
      skillId: restoredSkill.skillId
    });
    setDraftSkillsetId(restoredSkillset.skillsetId);
    setDraftSkillId(restoredSkill.skillId);
    setSelectedAnimsetId(profileQuery.data.equippedAnimsetId);
  }, [profileQuery.data, skillsets]);

  useEffect(() => {
    if (!profileQuery.error) {
      return;
    }

    if (
      profileQuery.error instanceof ApiClientError &&
      (profileQuery.error.code === "PLAYER_NOT_FOUND" || profileQuery.error.status === 404)
    ) {
      clearPlayerSession();
      setSession(null);
    }
    setStatusMessage(copy.restoreFailed);
  }, [profileQuery.error]);

  useEffect(() => {
    if (!skillsets.length) {
      return;
    }

    const selectedSkillsetExists = skillsets.some(
      (skillset) => skillset.skillsetId === draftSkillsetId
    );
    if (!selectedSkillsetExists) {
      const fallbackSkillset = skillsets[0];
      setDraftSkillsetId(fallbackSkillset.skillsetId);
      setDraftSkillId(fallbackSkillset.skills[0]?.skillId ?? initialBattleFlowState.selectedSkillId);
      return;
    }

    const selectedSkillExists = activeSkillset.skills.some((skill) => skill.skillId === draftSkillId);
    if (!selectedSkillExists) {
      setDraftSkillId(activeSkillset.skills[0]?.skillId ?? initialBattleFlowState.selectedSkillId);
    }
  }, [activeSkillset.skills, draftSkillId, draftSkillsetId, skillsets]);

  useEffect(() => {
    if (!animsets.length) {
      return;
    }

    const selectedAnimsetExists = animsets.some(
      (animset) => animset.animsetId === selectedAnimsetId
    );
    if (!selectedAnimsetExists) {
      setSelectedAnimsetId(animsets[0].animsetId);
    }
  }, [animsets, selectedAnimsetId]);

  useEffect(() => {
    if (state.screen !== "battle" || !state.battle || state.battle.status !== "ACTIVE") {
      return;
    }

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.battle, state.screen]);

  const isMyTurn = state.battle?.turnOwnerPlayerId === state.player.playerId;
  const isServerConfirming = state.input.serverConfirmationStatus === "PENDING";
  const isSkillGestureInputUnlocked = skillInputMode === "gesture_only" || skillVoiceArmed;
  const canUseGestureInput =
    state.screen === "battle" &&
    Boolean(state.battle) &&
    isMyTurn &&
    !isServerConfirming &&
    isSkillGestureInputUnlocked;
  const canStartLiveRecognizer =
    state.screen === "battle" && state.battle?.status === "ACTIVE";
  const completedStepCount = Math.min(state.input.currentStep, state.input.targetSequence.length);
  const remainingStepCount = Math.max(0, state.input.targetSequence.length - completedStepCount);
  const progressPercent = getSequenceProgress(
    completedStepCount,
    state.input.targetSequence.length
  );
  const isRestoringPlayer = profileQuery.isLoading;
  const hasPlayerSession = session !== null && profileQuery.data !== undefined;
  const hasConfiguredLoadout = profileQuery.data?.loadoutConfigured ?? false;
  const isCatalogLoading = skillsetsQuery.isLoading || animsetsQuery.isLoading;
  const catalogFailed = skillsetsQuery.isError || animsetsQuery.isError;
  const historyItems = historyQuery.data ?? [];
  const leaderboardEntries = leaderboardQuery.data ?? [];
  const playerLeaderboardEntry =
    leaderboardEntries.find((entry) => entry.playerId === state.player.playerId) ?? null;
  const deadlinePresentation = state.battle
    ? getDeadlinePresentation(state.battle.actionDeadlineAt, nowMs)
    : null;
  const selectedSkillCooldownTurns = state.battle?.self.cooldowns[state.selectedSkillId] ?? 0;
  const localProgressState = getLocalProgressState(
    state.input.localFailureReason,
    completedStepCount,
    state.input.targetSequence.length,
    state.recentEvents[0] ?? null
  );
  const submitFailureReason = getSubmitFailureReason(state);
  const submissionReadinessState = getSubmissionReadinessState(
    submitFailureReason,
    state.input.serverConfirmationStatus,
    state.input.serverRejectionReason
  );
  const practiceCompletedStepCount = Math.min(
    practiceProgress.currentStep,
    practiceProgress.targetSequence.length
  );
  const practiceProgressPercent = getSequenceProgress(
    practiceCompletedStepCount,
    practiceProgress.targetSequence.length
  );
  const practiceState = getPracticeState(
    practiceRecognizerStatus,
    practiceCompletedStepCount,
    practiceProgress.targetSequence.length
  );
  const canStartPractice =
    session !== null &&
    state.screen === "practice" &&
    practiceRecognizerStatus !== "starting" &&
    practiceRecognizerStatus !== "ready";
  const practiceExpectedGesture =
    practiceProgress.targetSequence[practiceProgress.currentStep] ??
    practiceProgress.targetSequence[0] ??
    null;
  const isPracticeGestureRecognized =
    practiceObservation?.reason === "recognized" &&
    practiceProgress.handDetected &&
    practiceProgress.currentGesture === practiceExpectedGesture &&
    practiceProgress.confidence >= LIVE_GESTURE_MIN_CONFIDENCE;
  const hasActiveBattle = state.battle?.status === "ACTIVE";
  const hasResultAvailable = state.battle?.status === "ENDED";
  const isMatchSearching = state.queueStatus === "SEARCHING";
  const isMatchFoundWaiting = state.queueStatus === "MATCHED" && !hasActiveBattle;
  const practiceCompleted = practiceProgress.completedRounds > 0;
  const isPracticeLoadoutSynced =
    draftSkillsetId === state.equippedSkillsetId && draftSkillId === state.selectedSkillId;
  const savedLoadoutLabel = hasConfiguredLoadout ? getSkillDisplayName(equippedSkill) : copy.loadoutPending;
  const battleSelectedSkill = findSkill(state.selectedSkillId);
  const matchProgressSteps = getMatchProgressSteps({
    hasPlayerSession,
    hasConfiguredLoadout,
    socketStatus: state.socketStatus,
    queueStatus: state.queueStatus,
    hasActiveBattle
  });
  const practiceRendererEvents = session
    ? buildPracticeRendererEvents({
        animsetId: selectedAnimsetId,
        completedAtMs: practiceCompletedAtMs,
        playerId: state.player.playerId,
        practiceExpectedGesture,
        practiceProgress,
        practiceState,
        selectedSkill
      })
    : [];
  const battleRendererEvents = state.battle
    ? buildBattleRendererEvents({
        action: battleRendererAction,
        animsetId: state.equippedAnimsetId,
        battle: state.battle,
        playerId: state.player.playerId,
        ratingChange: state.history[0]?.ratingChange ?? null,
        scene: "battle",
        selectedSkill: battleSelectedSkill
      })
    : [];
  const resultRendererEvents = state.battle
    ? buildBattleRendererEvents({
        action: battleRendererAction,
        animsetId: state.equippedAnimsetId,
        battle: state.battle,
        playerId: state.player.playerId,
        ratingChange: state.history[0]?.ratingChange ?? null,
        scene: "result",
        selectedSkill: battleSelectedSkill
      })
    : [];

  function handleOpenLoadout() {
    if (!session) {
      setStatusMessage(copy.matchEntryBlocked);
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "go", screen: "loadout" });
  }

  function handleStartQueue() {
    if (!session || !hasPlayerSession) {
      setStatusMessage(copy.matchEntryBlocked);
      return;
    }
    if (!hasConfiguredLoadout) {
      setStatusMessage(copy.loadoutRequired);
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "startQueue" });
    startQueueMutation.mutate(session.playerId);
  }

  function handleSaveLoadout() {
    if (!session) {
      setStatusMessage(copy.selectionRequired);
      return;
    }

    setStatusMessage(null);
    saveLoadoutMutation.mutate({
      playerId: session.playerId,
      skillsetId: draftSkillsetId,
      animsetId: selectedAnimsetId
    });
  }

  function handleSelectSkillset(skillset: Skillset) {
    const nextSkill = skillset.skills[0];
    if (!nextSkill) {
      return;
    }

    setDraftSkillsetId(skillset.skillsetId);
    setDraftSkillId(nextSkill.skillId);
  }

  function handleSelectSkill(skillId: string) {
    setDraftSkillId(skillId);
  }

  function handleCreateGuest() {
    const nickname = nicknameDraft.trim();
    if (!nickname) {
      setStatusMessage(copy.nicknamePlaceholder);
      return;
    }

    setStatusMessage(null);
    createGuestMutation.mutate(nickname);
  }

  function handleStartupFlow() {
    if (!session) {
      handleCreateGuest();
      return;
    }

    if (!hasPlayerSession) {
      setStatusMessage(copy.sessionRestoring);
      return;
    }

    if (!hasConfiguredLoadout) {
      handleOpenLoadout();
      return;
    }

    handleStartQueue();
  }

  function isSkillInputUnlockedNow(): boolean {
    const gate = skillInputGateRef.current;
    return gate.mode === "gesture_only" || gate.armed;
  }

  function handleStartVoiceStartup() {
    if (startupVoiceStatus === "listening") {
      return;
    }

    startupVoiceRecognizerRef.current?.stop();
    setStartupVoiceTranscript("");
    setStartupVoiceMatchedCommand(null);
    setStatusMessage(null);

    const recognizer = createJapaneseStartupVoiceCommandRecognizer({
      onResult: (result) => {
        setStartupVoiceTranscript(result.transcript);
        setStartupVoiceMatchedCommand(result.matchedCommand);

        if (result.status === "matched") {
          setStatusMessage(copy.startupVoiceSuccess);
          handleStartupFlow();
          return;
        }

        setStatusMessage(copy.startupVoiceFailure);
      },
      onStatusChange: (status) => {
        setStartupVoiceStatus(status);

        if (status === "unsupported") {
          setStatusMessage(copy.startupVoiceUnsupported);
          return;
        }

        if (status === "blocked") {
          setStatusMessage(copy.startupVoiceBlocked);
          return;
        }

        if (status === "error") {
          setStatusMessage(copy.startupVoiceError);
          return;
        }

        if (status === "rejected") {
          setStatusMessage(copy.startupVoiceFailure);
        }
      }
    });

    startupVoiceRecognizerRef.current = recognizer;
    void recognizer.start();
  }

  function handleManualStartupFallback() {
    startupVoiceRecognizerRef.current?.stop();
    startupVoiceRecognizerRef.current = null;
    setStartupVoiceStatus("idle");
    setStartupVoiceTranscript("");
    setStartupVoiceMatchedCommand(null);
    handleStartupFlow();
  }

  function handleSelectSkillInputMode(mode: SkillInputMode) {
    setSkillInputMode(mode);
    setSkillVoiceArmed(mode === "gesture_only");
    setSkillVoiceStatus("idle");
    setSkillVoiceTranscript("");
    setSkillVoiceMatchedCommand(null);
    stopSkillVoiceRecognizer();
    stopLiveRecognizer();

    if (mode === "voice_then_gesture" && stateRef.current.screen === "battle" && stateRef.current.battle?.status === "ACTIVE") {
      void handleStartLiveRecognizer();
    }
  }

  function handleStartSkillVoiceGate(autoStart = false) {
    if (skillVoiceStatus === "listening") {
      return;
    }

    stopSkillVoiceRecognizer();
    setSkillVoiceTranscript("");
    setSkillVoiceMatchedCommand(null);
    setSkillVoiceArmed(false);
    if (!autoStart) {
      setStatusMessage(null);
    }

    const recognizer = createJapaneseStartupVoiceCommandRecognizer({
      commands: getSkillVoiceGateCommands(selectedSkill),
      lang: getSkillVoiceGateLanguage(),
      onResult: (result) => {
        setSkillVoiceTranscript(result.transcript);
        setSkillVoiceMatchedCommand(result.matchedCommand);

        if (result.status === "matched") {
          setSkillVoiceArmed(true);
          setStatusMessage(copy.skillVoiceGateUnlocked);
          stopSkillVoiceRecognizer();
          void handleStartLiveRecognizer();
          return;
        }

        setSkillVoiceArmed(false);
        stopSkillVoiceRecognizer();
        if (!autoStart) {
          setStatusMessage(copy.startupVoiceFailure);
        }
      },
      onStatusChange: (status) => {
        setSkillVoiceStatus(autoStart && status === "rejected" ? "idle" : status);

        if (status === "unsupported") {
          stopSkillVoiceRecognizer();
          setStatusMessage(copy.startupVoiceUnsupported);
          return;
        }

        if (status === "blocked") {
          stopSkillVoiceRecognizer();
          setStatusMessage(copy.startupVoiceBlocked);
          return;
        }

        if (status === "error") {
          stopSkillVoiceRecognizer();
          setStatusMessage(copy.startupVoiceError);
          return;
        }

        if (status === "rejected") {
          stopSkillVoiceRecognizer();
          if (!autoStart) {
            setStatusMessage(copy.startupVoiceFailure);
          }
        }
      }
    });

    skillVoiceRecognizerRef.current = recognizer;
    void recognizer.start();
  }

  function handleCancelQueue() {
    if (!session) {
      return;
    }

    setStatusMessage(null);
    cancelQueueMutation.mutate(session.playerId);
  }

  function handleOpenHistory() {
    setStatusMessage(null);
    dispatch({ type: "go", screen: "history" });
  }

  function handleOpenMatchmaking() {
    if (state.queueStatus === "IDLE") {
      handleStartQueue();
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "go", screen: "matchmaking" });
  }

  function handleOpenBattle() {
    if (!hasActiveBattle) {
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "go", screen: "battle" });
  }

  function handleOpenResult() {
    if (!hasResultAvailable) {
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "go", screen: "result" });
  }

  function handleGoHome() {
    setStatusMessage(null);
    dispatch({ type: "go", screen: "home" });
  }

  function handleNavigate(screen: ScreenKey) {
    if (screen === "practice" && !session) {
      setStatusMessage(copy.practiceAccountRequired);
      dispatch({ type: "go", screen: "home" });
      return;
    }

    setStatusMessage(null);
    dispatch({ type: "go", screen });
  }

  function handleSubmitAction() {
    const failureReason = getSubmitFailureReason(state);

    if (!isSkillInputUnlockedNow()) {
      setStatusMessage(copy.skillVoiceGateRequired);
      return;
    }

    dispatch({ type: "submitSkill" });

    if (failureReason !== null || !state.battle || !session) {
      return;
    }

    const connection = socketConnectionRef.current;
    if (!connection) {
      dispatch({ type: "actionRejected", reason: null, latencyMs: 0 });
      setStatusMessage(copy.actionSubmitFailed);
      return;
    }

    const actionId = createClientActionId();
    const requestId = createClientRequestId();
    pendingActionRef.current = {
      actionId,
      requestId,
      submittedAtMs: Date.now()
    };
    setBattleRendererAction({
      actionId,
      actorPlayerId: session.playerId,
      reason: null,
      result: "pending",
      skillId: state.selectedSkillId,
      skillName: findSkill(state.selectedSkillId).name
    });

    try {
      connection.sendSubmitAction({
        battleSessionId: state.battle.battleSessionId,
        playerId: session.playerId,
        turnNumber: state.battle.turnNumber,
        actionId,
        gestureSequence: [...findSkill(state.selectedSkillId).gestureSequence],
        submittedAt: new Date().toISOString(),
        requestId
      });
      if (skillInputMode === "voice_then_gesture") {
        setSkillVoiceArmed(false);
        setSkillVoiceStatus("idle");
        setSkillVoiceTranscript("");
        setSkillVoiceMatchedCommand(null);
      }
      setStatusMessage(null);
    } catch {
      pendingActionRef.current = null;
      setBattleRendererAction((current) =>
        current
          ? {
              ...current,
              reason: copy.actionSubmitFailed,
              result: "rejected"
            }
          : null
      );
      dispatch({ type: "actionRejected", reason: null, latencyMs: 0 });
      setStatusMessage(copy.actionSubmitFailed);
    }
  }

  function handleGestureInput(gesture: string, source: GestureInputSource) {
    if (!isSkillInputUnlockedNow()) {
      setStatusMessage(copy.skillVoiceGateRequired);
      return;
    }

    const input =
      source === "debug_fallback"
        ? createDebugFallbackInput(gesture)
        : createLiveCameraInput(gesture, 0.91);

    dispatch({
      type: "receiveGestureInput",
      gesture: input.gesture,
      confidence: input.confidence,
      source: input.source
    });
  }

  async function handleStartLiveRecognizer() {
    if (liveRecognizerRef.current) {
      return;
    }

    setStatusMessage(null);
    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => stateRef.current.input.targetSequence,
      getExpectedToken: () => {
        const input = stateRef.current.input;
        return input.targetSequence[input.currentStep] ?? null;
      },
      onObservation: handleLiveGestureObservation,
      onStatusChange: handleLiveRecognizerStatusChange
    });

    liveRecognizerRef.current = recognizer;
    await recognizer.start();
  }

  function handleLiveRecognizerStatusChange(status: LiveGestureRecognizerStatus) {
    setLiveRecognizerStatus(status);

    if (status === "blocked" || status === "unsupported" || status === "error") {
      liveRecognizerRef.current = null;
      liveInputHoldTokenRef.current = null;
    }
  }

  function handleLiveGestureObservation(
    observation: LiveGestureObservation,
    input: ReturnType<typeof createLiveCameraInput> | null
  ) {
    setLiveObservation(observation);
    syncHeldLiveCameraGesture(observation, liveInputHoldTokenRef);

    if (input && canAcceptLiveGestureInput(stateRef.current)) {
      if (!isSkillInputUnlockedNow()) {
        dispatch({
          type: "receiveGestureObservation",
          cameraReady: isCameraReadyObservation(observation),
          handDetected: observation.handDetected,
          gesture: observation.token,
          confidence: observation.confidence,
          source: "live_camera"
        });
        return;
      }

      const consumableInput = consumeHeldLiveCameraInput(input, liveInputHoldTokenRef);
      if (!consumableInput) {
        dispatch({
          type: "receiveGestureObservation",
          cameraReady: isCameraReadyObservation(observation),
          handDetected: observation.handDetected,
          gesture: observation.token,
          confidence: observation.confidence,
          source: "live_camera"
        });
        return;
      }

      dispatch({
        type: "receiveGestureInput",
        gesture: consumableInput.gesture,
        confidence: consumableInput.confidence,
        source: consumableInput.source
      });
      return;
    }

    dispatch({
      type: "receiveGestureObservation",
      cameraReady: isCameraReadyObservation(observation),
      handDetected: observation.handDetected,
      gesture: observation.token,
      confidence: observation.confidence,
      source: "live_camera"
    });
  }

  function stopLiveRecognizer() {
    const recognizer = liveRecognizerRef.current;
    if (!recognizer) {
      return;
    }

    recognizer.stop();
    liveRecognizerRef.current = null;
    liveInputHoldTokenRef.current = null;
    setLiveObservation(null);
  }

  function stopSkillVoiceRecognizer() {
    skillVoiceRecognizerRef.current?.stop();
    skillVoiceRecognizerRef.current = null;
  }

  function handleRunDeterministicFallback() {
    if (!isSkillInputUnlockedNow()) {
      setStatusMessage(copy.skillVoiceGateRequired);
      return;
    }

    const sequence = createDeterministicFallbackSequence(state.input.targetSequence);
    for (const input of sequence) {
      dispatch({
        type: "receiveGestureInput",
        gesture: input.gesture,
        confidence: input.confidence,
        source: input.source
      });
    }
  }

  function resetPracticeProgress(skill = selectedSkill) {
    clearPracticeAutoAdvance();
    practiceHeldGestureRef.current = null;
    setPracticeCompletedAtMs(null);
    const nextProgress = {
      targetSequence: [...skill.gestureSequence],
      currentStep: 0,
      completedRounds: 0,
      confidence: 0,
      handDetected: false,
      currentGesture: null
    };
    practiceProgressRef.current = nextProgress;
    setPracticeProgress(nextProgress);
    setPracticeObservation(null);
  }

  async function handleStartPractice() {
    if (!session) {
      setStatusMessage(copy.practiceAccountRequired);
      return;
    }

    if (practiceRecognizerRef.current) {
      return;
    }

    setStatusMessage(null);
    const recognizer = createBrowserLiveGestureRecognizer({
      getTargetSequence: () => practiceProgressRef.current.targetSequence,
      getExpectedToken: () =>
        practiceProgressRef.current.targetSequence[practiceProgressRef.current.currentStep] ?? null,
      onObservation: handlePracticeObservation,
      onStatusChange: handlePracticeRecognizerStatusChange,
      createVideoElement: () => {
        const video = practiceVideoRef.current ?? document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        return video;
      }
    });

    practiceRecognizerRef.current = recognizer;
    await recognizer.start();
  }

  function handlePracticeRecognizerStatusChange(status: LiveGestureRecognizerStatus) {
    setPracticeRecognizerStatus(status);

    if (status === "blocked" || status === "unsupported" || status === "error" || status === "stopped") {
      practiceRecognizerRef.current = null;
      practiceHeldGestureRef.current = null;
    }
  }

  function handlePracticeObservation(observation: LiveGestureObservation) {
    setPracticeObservation(observation);

    const progress = practiceProgressRef.current;
    const nextProgress = {
      ...progress,
      confidence: observation.confidence,
      handDetected: observation.handDetected,
      currentGesture: observation.token
    };

    syncHeldPracticeGesture(observation, practiceHeldGestureRef);
    practiceProgressRef.current = nextProgress;
    setPracticeProgress(nextProgress);
    schedulePracticeAutoAdvance(observation);
  }

  function schedulePracticeAutoAdvance(observation: LiveGestureObservation) {
    const progress = practiceProgressRef.current;
    const expectedGesture = progress.targetSequence[progress.currentStep] ?? null;

    if (
      observation.reason !== "recognized" ||
      !observation.handDetected ||
      observation.confidence < LIVE_GESTURE_MIN_CONFIDENCE ||
      !expectedGesture ||
      observation.token !== expectedGesture
    ) {
      clearPracticeAutoAdvance();
      return;
    }

    if (practiceHeldGestureRef.current === expectedGesture) {
      return;
    }

    const key = `${progress.completedRounds}:${progress.currentStep}:${expectedGesture}`;
    if (practiceAutoAdvanceRef.current?.key === key) {
      return;
    }

    clearPracticeAutoAdvance();
    practiceAutoAdvanceRef.current = {
      key,
      timeoutId: window.setTimeout(() => {
        advanceRecognizedPracticeGesture(observation, key);
      }, PRACTICE_AUTO_ADVANCE_DELAY_MS)
    };
  }

  function advanceRecognizedPracticeGesture(
    observation: LiveGestureObservation,
    key: string
  ) {
    const scheduledAdvance = practiceAutoAdvanceRef.current;
    if (!scheduledAdvance || scheduledAdvance.key !== key) {
      return;
    }

    scheduledAdvance.timeoutId = null;
    const progress = practiceProgressRef.current;
    const expectedGesture = progress.targetSequence[progress.currentStep] ?? null;

    if (
      observation.reason !== "recognized" ||
      !observation.handDetected ||
      observation.confidence < LIVE_GESTURE_MIN_CONFIDENCE ||
      !expectedGesture ||
      observation.token !== expectedGesture
    ) {
      clearPracticeAutoAdvance();
      return;
    }

    practiceHeldGestureRef.current = expectedGesture;
    const nextStep = progress.currentStep + 1;
    const didCompleteRound = nextStep >= progress.targetSequence.length;
    if (didCompleteRound) {
      setPracticeCompletedAtMs(Date.now());
    }
    const nextProgress = {
      ...progress,
      currentStep: didCompleteRound ? 0 : nextStep,
      completedRounds: didCompleteRound
        ? progress.completedRounds + 1
        : progress.completedRounds,
      confidence: 0,
      handDetected: false,
      currentGesture: null
    };

    practiceProgressRef.current = nextProgress;
    setPracticeProgress(nextProgress);
    setPracticeObservation(null);
    setStatusMessage(
      didCompleteRound
        ? `${copy.practiceRoundComplete} ${nextProgress.completedRounds}${copy.practiceRoundUnit}`
        : null
    );
  }

  function clearPracticeAutoAdvance() {
    const scheduledAdvance = practiceAutoAdvanceRef.current;
    if (scheduledAdvance?.timeoutId !== null && scheduledAdvance?.timeoutId !== undefined) {
      window.clearTimeout(scheduledAdvance.timeoutId);
    }
    practiceAutoAdvanceRef.current = null;
  }

  function stopPracticeRecognizer() {
    const recognizer = practiceRecognizerRef.current;
    if (!recognizer) {
      return;
    }

    recognizer.stop();
    practiceRecognizerRef.current = null;
    practiceHeldGestureRef.current = null;
    clearPracticeAutoAdvance();
  }

  function handleSurrender() {
    if (!session || !state.battle) {
      return;
    }

    setStatusMessage(null);
    surrenderMutation.mutate({
      battleSessionId: state.battle.battleSessionId,
      playerId: session.playerId
    });
  }

  function handleBattleSocketEvent(event: BattleSocketEvent) {
    switch (event.type) {
      case "battle.match_ready":
        dispatch({ type: "queueReady" });
        return;
      case "battle.match_found":
        dispatch({
          type: "matchFound",
          battleSessionId: event.payload.battleSessionId
        });
        return;
      case "battle.started": {
        const battle = toBattleState(event.payload.battle);
        if (shouldIgnoreIncomingBattleSnapshot(stateRef.current.battle, battle)) {
          return;
        }
        pendingActionRef.current = null;
        setBattleRendererAction(null);
        dispatch({
          type: "battleStarted",
          battle
        });
        setStatusMessage(null);
        return;
      }
      case "battle.action_result": {
        if (event.payload.status === "ACCEPTED") {
          return;
        }
        const latencyMs = consumePendingActionLatencyIfMatched({
          actionId: event.payload.actionId,
          requestId: event.requestId
        });
        if (latencyMs === null) {
          return;
        }
        dispatch({
          type: "actionRejected",
          reason: event.payload.reason,
          latencyMs
        });
        setBattleRendererAction({
          actionId: event.payload.actionId,
          actorPlayerId: stateRef.current.player.playerId,
          reason: event.payload.reason,
          result: "rejected",
          skillId: stateRef.current.selectedSkillId,
          skillName: findSkill(stateRef.current.selectedSkillId).name
        });
        return;
      }
      case "battle.state_updated": {
        const battle = toBattleState(event.payload.battle);
        if (shouldIgnoreIncomingBattleSnapshot(stateRef.current.battle, battle)) {
          return;
        }
        const latencyMs = consumePendingActionLatency({
          actionId: event.payload.sourceActionId
        });
        dispatch({
          type: "battleStateUpdated",
          battle,
          latencyMs
        });
        setBattleRendererAction({
          actionId: event.payload.sourceActionId ?? `state_${battle.battleSessionId}_${battle.turnNumber}`,
          actorPlayerId: stateRef.current.player.playerId,
          reason: null,
          result: "accepted",
          skillId: stateRef.current.selectedSkillId,
          skillName: findSkill(stateRef.current.selectedSkillId).name
        });
        setStatusMessage(null);
        return;
      }
      case "battle.timeout":
      case "battle.surrendered":
        return;
      case "battle.ended": {
        const battle = toBattleState(event.payload.battle);
        if (shouldIgnoreIncomingBattleSnapshot(stateRef.current.battle, battle)) {
          return;
        }
        consumePendingActionLatency();
        dispatch({
          type: "battleEnded",
          battle,
          ratingChange: event.payload.ratingChange ?? 0
        });
        setBattleRendererAction((current) =>
          current?.result === "pending"
            ? {
                ...current,
                reason: null,
                result: "accepted"
              }
            : current
        );
        if (session) {
          void queryClient.invalidateQueries({
            queryKey: ["matchHistory", session.playerId]
          });
          void queryClient.invalidateQueries({
            queryKey: ["playerProfile", session.playerId]
          });
        }
        void queryClient.invalidateQueries({
          queryKey: ["leaderboard"]
        });
        setStatusMessage(null);
        return;
      }
      case "battle.error": {
        const latencyMs = consumePendingActionLatency({
          requestId: event.requestId
        });
        dispatch({ type: "actionRejected", reason: null, latencyMs });
        setBattleRendererAction((current) =>
          current
            ? {
                ...current,
                reason: event.payload.message || null,
                result: "rejected"
              }
            : null
        );
        setStatusMessage(event.payload.message || copy.actionSubmitFailed);
        return;
      }
    }
  }

  async function ensureBattleSocketConnection(playerId: string): Promise<void> {
    if (socketConnectionRef.current) {
      return;
    }

    const wsToken = await getWsToken(playerId);
    socketConnectionRef.current = await connectBattleSocket({
      token: wsToken.wsToken,
      onClose: () => {
        const shouldIgnoreClose = ignoreSocketCloseRef.current;
        ignoreSocketCloseRef.current = false;
        socketConnectionRef.current = null;
        if (shouldIgnoreClose) {
          return;
        }
        dispatch({ type: "socketDisconnected" });
        setStatusMessage(copy.socketDisconnected);
      },
      onEvent: handleBattleSocketEvent
    });
  }

  async function reconnectBattleSocket(playerId: string): Promise<void> {
    if (reconnectInFlightRef.current) {
      return;
    }

    reconnectInFlightRef.current = true;
    try {
      await ensureBattleSocketConnection(playerId);
    } catch {
      dispatch({ type: "socketDisconnected" });
      setStatusMessage(copy.socketDisconnected);
    } finally {
      reconnectInFlightRef.current = false;
    }
  }

  function closeBattleSocket(suppressCloseMessage: boolean) {
    const connection = socketConnectionRef.current;
    if (!connection) {
      ignoreSocketCloseRef.current = false;
      return;
    }

    ignoreSocketCloseRef.current = suppressCloseMessage;
    socketConnectionRef.current = null;
    connection.close();
  }

  function consumePendingActionLatency(match?: {
    actionId?: string;
    requestId?: string;
  }): number {
    const pendingAction = pendingActionRef.current;
    if (!pendingAction) {
      return stateRef.current.input.networkLatencyMs;
    }

    const matchesActionId = match?.actionId === undefined || match.actionId === pendingAction.actionId;
    const matchesRequestId =
      match?.requestId === undefined || match.requestId === pendingAction.requestId;
    if (!matchesActionId || !matchesRequestId) {
      return stateRef.current.input.networkLatencyMs;
    }

    pendingActionRef.current = null;
    return Math.max(0, Date.now() - pendingAction.submittedAtMs);
  }

  function consumePendingActionLatencyIfMatched(match: {
    actionId?: string;
    requestId?: string;
  }): number | null {
    const pendingAction = pendingActionRef.current;
    if (!pendingAction) {
      return null;
    }

    const matchesActionId = match.actionId === undefined || match.actionId === pendingAction.actionId;
    const matchesRequestId =
      match.requestId === undefined || match.requestId === pendingAction.requestId;
    if (!matchesActionId || !matchesRequestId) {
      return null;
    }

    pendingActionRef.current = null;
    return Math.max(0, Date.now() - pendingAction.submittedAtMs);
  }

  const playerStatusLabel = isRestoringPlayer
    ? copy.sessionRestoring
    : hasConfiguredLoadout
      ? copy.playerReady
      : hasPlayerSession
        ? copy.loadoutPending
      : copy.playerMissing;
  const playerStatusTone = hasConfiguredLoadout ? "success" : "warning";
  const isStartupActionPending = createGuestMutation.isPending || startQueueMutation.isPending;
  const practiceLoadoutNotice = isPracticeLoadoutSynced
    ? copy.practiceLoadoutSynced
    : copy.practiceLoadoutUnsynced;
  const matchStatusHelp =
    state.socketStatus === "DISCONNECTED" && state.queueStatus !== "IDLE"
      ? copy.matchmakingDisconnectedHelp
      : state.queueStatus === "MATCHED"
        ? copy.matchmakingMatchedHelp
        : copy.matchmakingSearchingHelp;

  let homePrimaryAction: HomeAction;
  let homePrimaryDisabled = false;
  let homeLockedActionReason: string | null = null;
  const homeSecondaryActions: HomeAction[] = [];

  if (isRestoringPlayer) {
    homePrimaryAction = {
      actionLabel: copy.sessionRestoring,
      actionVariant: "primary",
      description: copy.sessionRestoring,
      onClick: () => undefined
    };
    homePrimaryDisabled = true;
  } else if (!session) {
    homePrimaryAction = {
      actionLabel: copy.startGuest,
      actionVariant: "primary",
      description: copy.homeActionHelpNoSession,
      onClick: handleCreateGuest
    };
  } else if (hasResultAvailable) {
    homePrimaryAction = {
      actionLabel: copy.viewResult,
      actionVariant: "primary",
      description: copy.homeActionHelpResult,
      onClick: handleOpenResult
    };
    homeSecondaryActions.push({
      actionLabel: copy.viewHistory,
      actionVariant: "default",
      description: copy.resultNextActionHelp,
      onClick: handleOpenHistory
    });
  } else if (hasActiveBattle) {
    homePrimaryAction = {
      actionLabel: copy.returnToBattle,
      actionVariant: "primary",
      description: copy.homeActionHelpBattle,
      onClick: handleOpenBattle
    };
  } else if (isMatchSearching) {
    homePrimaryAction = {
      actionLabel: copy.cancelQueue,
      actionVariant: "primary",
      description: copy.homeActionHelpQueue,
      onClick: handleCancelQueue
    };
    homePrimaryDisabled = cancelQueueMutation.isPending;
  } else if (isMatchFoundWaiting) {
    homePrimaryAction = {
      actionLabel: copy.viewMatchmaking,
      actionVariant: "primary",
      description: copy.homeActionHelpMatched,
      onClick: handleOpenMatchmaking
    };
  } else if (!hasConfiguredLoadout) {
    homePrimaryAction = {
      actionLabel: copy.openLoadoutSetup,
      actionVariant: "primary",
      description: copy.homeActionHelpLoadout,
      onClick: handleOpenLoadout
    };
    homeSecondaryActions.push({
      actionLabel: copy.startPracticeMode,
      actionVariant: "default",
      description: copy.practiceHelp,
      onClick: () => handleNavigate("practice")
    });
    homeLockedActionReason = copy.loadoutRequired;
  } else {
    homePrimaryAction = {
      actionLabel: copy.startMatch,
      actionVariant: "primary",
      description: copy.homeActionHelpReady,
      onClick: handleStartQueue
    };
    homeSecondaryActions.push(
      {
        actionLabel: copy.startPracticeMode,
        actionVariant: "default",
        description: copy.practiceHelp,
        onClick: () => handleNavigate("practice")
      },
      {
        actionLabel: copy.editLoadout,
        actionVariant: "default",
        description: copy.loadout,
        onClick: handleOpenLoadout
      }
    );
  }

  const progressBanner = getProgressBannerState({
    activeScreen: state.screen,
    hasActiveBattle,
    hasResultAvailable,
    isMatchFoundWaiting,
    isMatchSearching,
    onCancelQueue: handleCancelQueue,
    onOpenBattle: handleOpenBattle,
    onOpenMatchmaking: handleOpenMatchmaking,
    onOpenResult: handleOpenResult
  });

  return (
    <section className="play-workspace" aria-label={copy.appTitle}>
      <nav className="play-nav" aria-label="playflow">
        {navigationScreenOrder.map((screen) => (
          <button
            aria-current={state.screen === screen ? "page" : undefined}
            className="play-nav__button"
            key={screen}
            onClick={() => handleNavigate(screen)}
            type="button"
          >
            {copy[screen]}
          </button>
        ))}
      </nav>

      <div className="play-main">
        {progressBanner ? (
          <div className="progress-banner" data-state={progressBanner.state}>
            <div className="progress-banner__content">
              <StatusBadge tone={getProgressBannerTone(progressBanner.state)}>
                {progressBanner.label}
              </StatusBadge>
              <p className="helper-text">{progressBanner.description}</p>
            </div>
            <Button
              disabled={progressBanner.disabled}
              onClick={progressBanner.onClick}
              variant={progressBanner.variant}
            >
              {progressBanner.actionLabel}
            </Button>
          </div>
        ) : null}

        {state.screen === "home" ? (
          <div className="surface-grid">
            <Panel title={copy.playerRating}>
              <StatusBadge tone={playerStatusTone}>{playerStatusLabel}</StatusBadge>
              <Metric label={copy.playerStatus} value={state.player.nickname} />
              <Metric label={copy.playerRating} value={state.player.rating} />
              <Metric label={copy.record} value={`${state.player.wins}W / ${state.player.losses}L`} />
              <Metric label={copy.skillDetail} value={getSkillDisplayName(equippedSkill)} />
            </Panel>
            <Panel title={copy.nextAction}>
              <div className="field-stack">
                {!session ? (
                  <label className="field">
                    <span className="field__label">{copy.nickname}</span>
                    <input
                      className="text-input"
                      name="nickname"
                      onChange={(event) => setNicknameDraft(event.target.value)}
                      placeholder={copy.nicknamePlaceholder}
                      value={nicknameDraft}
                    />
                  </label>
                ) : null}
                <div className="home-action-card">
                  <strong>{homePrimaryAction.actionLabel}</strong>
                  <p className="helper-text">{homePrimaryAction.description}</p>
                </div>
                {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
                <div className="action-row">
                  <Button
                    disabled={
                      homePrimaryDisabled ||
                      (homePrimaryAction.actionLabel === copy.startGuest && createGuestMutation.isPending) ||
                      (homePrimaryAction.actionLabel === copy.startMatch && startQueueMutation.isPending)
                    }
                    onClick={homePrimaryAction.onClick}
                    variant={homePrimaryAction.actionVariant}
                  >
                    {homePrimaryAction.actionLabel}
                  </Button>
                  {homeSecondaryActions.map((action) => (
                    <Button key={action.actionLabel} onClick={action.onClick} variant={action.actionVariant}>
                      {action.actionLabel}
                    </Button>
                  ))}
                </div>
                {homeLockedActionReason ? (
                  <div className="locked-action">
                    <span className="field__label">{copy.lockedAction}</span>
                    <div className="action-row">
                      <Button disabled>{copy.startMatch}</Button>
                    </div>
                    <p className="helper-text">{homeLockedActionReason}</p>
                  </div>
                ) : null}
              </div>
            </Panel>
            <StartupVoicePanel
              commands={JAPANESE_STARTUP_COMMANDS}
              disabled={isStartupActionPending}
              matchedCommand={startupVoiceMatchedCommand}
              onManualStart={handleManualStartupFallback}
              onStart={handleStartVoiceStartup}
              status={startupVoiceStatus}
              transcript={startupVoiceTranscript}
            />
            <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
          </div>
        ) : null}

        {state.screen === "loadout" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.loadout}>
              {!session ? <p className="helper-text">{copy.matchEntryBlocked}</p> : null}
              {isCatalogLoading ? <p className="helper-text">{copy.catalogLoading}</p> : null}
              {catalogFailed ? <p className="status-text">{copy.catalogFailed}</p> : null}
              <div className="skill-list">
                {skillsets.map((skillset) => (
                  <button
                    aria-pressed={draftSkillsetId === skillset.skillsetId}
                    className="skill-card"
                    key={skillset.skillsetId}
                    onClick={() => handleSelectSkillset(skillset)}
                    type="button"
                  >
                    <strong>{skillset.name}</strong>
                    <div>
                      {copy.skillset} {skillset.skillsetId}
                    </div>
                  </button>
                ))}
              </div>
              <div className="skill-list">
                {activeSkillset.skills.map((skill) => (
                  <button
                    aria-pressed={draftSkillId === skill.skillId}
                    className="skill-card"
                    key={skill.skillId}
                    onClick={() => handleSelectSkill(skill.skillId)}
                    type="button"
                  >
                    <SkillCardContent skill={skill} />
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title={copy.skillDetail}>
              <SkillDetailContent skill={selectedSkill} />
              <div className="field-stack">
                <span className="field__label">{copy.animsetCatalog}</span>
                <div className="skill-list">
                  {animsets.map((animset) => (
                    <button
                      aria-pressed={selectedAnimsetId === animset.animsetId}
                      className="skill-card"
                      key={animset.animsetId}
                      onClick={() => setSelectedAnimsetId(animset.animsetId)}
                      type="button"
                    >
                      <strong>{animset.name}</strong>
                      <div>{animset.animsetId}</div>
                    </button>
                  ))}
                </div>
              </div>
              {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
              <div className="action-row">
                <Button
                  disabled={!session || saveLoadoutMutation.isPending || isCatalogLoading || catalogFailed}
                  variant="primary"
                  onClick={handleSaveLoadout}
                >
                  {copy.saveLoadout}
                </Button>
                <Button onClick={() => dispatch({ type: "go", screen: "home" })}>
                  {copy.home}
                </Button>
              </div>
            </Panel>
          </div>
        ) : null}

        {state.screen === "practice" ? (
          <div className="surface-grid surface-grid--practice">
            <Panel title={copy.practiceRoom}>
              {!session ? (
                <p className="status-text">{copy.practiceAccountRequired}</p>
              ) : (
                <div className="practice-room">
                  <div className="practice-camera">
                    <video
                      aria-label={copy.practiceCameraPreview}
                      className="practice-camera__video"
                      muted
                      playsInline
                      ref={practiceVideoRef}
                    />
                    <canvas
                      aria-hidden="true"
                      className="practice-camera__mesh"
                      ref={practiceMeshCanvasRef}
                    />
                    <div className="practice-camera__overlay">
                      <StatusBadge tone={getPracticeStatusTone(practiceState)}>
                        {getPracticeStatusLabel(practiceState)}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="field-stack">
                    <p className="helper-text">{copy.practiceHelp}</p>
                    <p className="helper-text">{copy.practiceLoadoutSeparation}</p>
                  </div>
                  <div className="renderer-section">
                    <span className="field__label">{copy.rendererPanelPractice}</span>
                    <AnimsetRendererSurface
                      animsetId={selectedAnimsetId}
                      events={practiceRendererEvents}
                      scene="practice"
                    />
                  </div>
                  <div className="practice-guide">
                    <StatusBadge tone={isPracticeGestureRecognized ? "success" : "neutral"}>
                      {isPracticeGestureRecognized
                        ? copy.practiceGestureReady
                        : copy.practiceGestureWaiting}
                    </StatusBadge>
                    <div>
                      <strong>{copy.practiceExpectedGesture}</strong>
                      <span>{practiceExpectedGesture ?? copy.noGesture}</span>
                    </div>
                    <p>{getPracticeGestureGuide(practiceExpectedGesture)}</p>
                    <p className="helper-text">
                      {getPracticeRuntimeHelp(practiceRecognizerStatus, practiceObservation)}
                    </p>
                  </div>
                  <ProgressMeter
                    current={practiceCompletedStepCount}
                    label={copy.practiceProgress}
                    percent={practiceProgressPercent}
                    total={practiceProgress.targetSequence.length}
                  />
                  <div className="sequence" aria-label={copy.targetSequence}>
                    {practiceProgress.targetSequence.map((gesture, index) => (
                      <span
                        className="sequence__item sequence__item--display"
                        data-state={getGestureStepState(index, practiceProgress.currentStep)}
                        key={`${gesture}-${index}`}
                      >
                        {gesture}
                      </span>
                    ))}
                  </div>
                  <div className="metric-list">
                    <Metric label={copy.skillDetail} value={getSkillDisplayName(selectedSkill)} />
                    <Metric label={copy.skillDescription} value={getSkillPresentation(selectedSkill).summary} />
                    <Metric label={copy.practiceRounds} value={practiceProgress.completedRounds} />
                    <Metric label={copy.liveCameraStatus} value={getLiveRecognizerStatusLabel(practiceRecognizerStatus)} />
                    <Metric
                      label={copy.handStatus}
                      value={practiceProgress.handDetected ? copy.detected : copy.notDetected}
                    />
                    <Metric
                      label={copy.liveObservationReason}
                      value={
                        practiceObservation
                          ? getLiveObservationReasonLabel(practiceObservation.reason)
                          : copy.inputSourceWaiting
                      }
                    />
                    <Metric label={copy.currentGesture} value={practiceProgress.currentGesture ?? copy.noGesture} />
                    <Metric label={copy.confidence} value={`${Math.round(practiceProgress.confidence * 100)}%`} />
                  </div>
                  {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
                  <div className="action-row">
                    <Button disabled={!canStartPractice} onClick={handleStartPractice} variant="primary">
                      {practiceRecognizerStatus === "starting"
                        ? getLiveRecognizerStatusLabel(practiceRecognizerStatus)
                        : copy.practiceStart}
                    </Button>
                    <Button
                      disabled={practiceRecognizerStatus !== "ready"}
                      onClick={stopPracticeRecognizer}
                    >
                      {copy.practiceStop}
                    </Button>
                    <Button onClick={() => resetPracticeProgress()}>{copy.practiceReset}</Button>
                  </div>
                </div>
              )}
            </Panel>
            <Panel title={copy.practiceSelectSkill}>
              <div className="practice-loadout-summary">
                <Metric label={copy.practiceCurrentSkill} value={getSkillDisplayName(selectedSkill)} />
                <Metric label={copy.practiceSavedLoadout} value={savedLoadoutLabel} />
                <StatusBadge tone={isPracticeLoadoutSynced ? "success" : "warning"}>
                  {isPracticeLoadoutSynced ? copy.ready : copy.checkRequired}
                </StatusBadge>
                <p className="helper-text">{practiceLoadoutNotice}</p>
              </div>
              <div className="skill-list">
                {activeSkillset.skills.map((skill) => (
                  <button
                    aria-pressed={draftSkillId === skill.skillId}
                    className="skill-card"
                    key={skill.skillId}
                    onClick={() => handleSelectSkill(skill.skillId)}
                    type="button"
                  >
                    <SkillCardContent skill={skill} showGestureGuide />
                  </button>
                ))}
              </div>
              {practiceCompleted ? (
                <div className="practice-completion-actions">
                  <strong>{copy.practiceSkillComplete}</strong>
                  <p className="helper-text">{copy.practiceCompletionHelp}</p>
                  <div className="action-row">
                    <Button onClick={() => resetPracticeProgress()}>{copy.practiceReset}</Button>
                    <Button
                      disabled={!session || saveLoadoutMutation.isPending || isCatalogLoading || catalogFailed}
                      onClick={handleSaveLoadout}
                    >
                      {copy.saveLoadout}
                    </Button>
                    <Button
                      disabled={!hasConfiguredLoadout || startQueueMutation.isPending}
                      onClick={handleStartQueue}
                      variant="primary"
                    >
                      {copy.practiceContinueMatch}
                    </Button>
                  </div>
                  {!hasConfiguredLoadout ? <p className="helper-text">{copy.loadoutRequired}</p> : null}
                </div>
              ) : null}
            </Panel>
          </div>
        ) : null}

        {state.screen === "matchmaking" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.matchingStatus}>
              <div className="match-progress">
                {matchProgressSteps.map((step) => (
                  <div className="match-progress__step" data-state={step.state} key={step.label}>
                    <strong>{step.label}</strong>
                    <StatusBadge tone={getStepTone(step.state)}>
                      {getStepLabel(step.state)}
                    </StatusBadge>
                  </div>
                ))}
              </div>
              <div className="metric-list">
                <Metric label={copy.matchingStatus} value={state.queueStatus} />
                <Metric label={copy.socketStatus} value={state.socketStatus} />
                <Metric
                  label={copy.cameraStatus}
                  value={state.input.cameraReady ? copy.ready : copy.checkRequired}
                />
              </div>
              <p className="helper-text">{matchStatusHelp}</p>
              {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
              <div className="action-row">
                <Button
                  disabled={cancelQueueMutation.isPending || state.queueStatus === "MATCHED"}
                  onClick={handleCancelQueue}
                >
                  {copy.cancelQueue}
                </Button>
              </div>
            </Panel>
            <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
          </div>
        ) : null}

        {state.screen === "battle" && state.battle ? (
          <>
            <div className="battle-board">
              <FighterPanel
                cooldowns={state.battle.self.cooldowns}
                title={copy.self}
                hp={state.battle.self.hp}
                isActive={isMyTurn && !isServerConfirming}
                mana={state.battle.self.mana}
              />
              <div className="battle-center" data-state={getTurnState(isMyTurn, isServerConfirming)}>
                <StatusBadge tone={getTurnTone(isMyTurn, isServerConfirming)}>
                  {getTurnStatusLabel(isMyTurn, isServerConfirming)}
                </StatusBadge>
                <Metric label={copy.turnNumber} value={state.battle.turnNumber} />
                {deadlinePresentation ? (
                  <div className="battle-deadline">
                    <span>{copy.turnDeadline}</span>
                    <StatusBadge tone={deadlinePresentation.tone}>
                      {deadlinePresentation.label}
                    </StatusBadge>
                  </div>
                ) : null}
                <p className="turn-hint">{getTurnHint(isMyTurn, isServerConfirming)}</p>
              </div>
              <FighterPanel
                cooldowns={state.battle.opponent.cooldowns}
                title={copy.opponent}
                hp={state.battle.opponent.hp}
                isActive={!isMyTurn && !isServerConfirming}
                mana={state.battle.opponent.mana}
              />
            </div>
            <div className="surface-grid">
              <Panel title={copy.rendererPanelBattle}>
                <AnimsetRendererSurface
                  animsetId={state.equippedAnimsetId}
                  events={battleRendererEvents}
                  scene="battle"
                />
              </Panel>
              <Panel title={copy.selectedSkillStatus}>
                <SkillDetailContent
                  skill={battleSelectedSkill}
                  selectedCooldownTurns={selectedSkillCooldownTurns}
                />
                {deadlinePresentation ? (
                  <Metric label={copy.turnDeadline} value={deadlinePresentation.label} />
                ) : null}
              </Panel>
              <Panel title={copy.inputConsole}>
                <div className="skill-input-mode">
                  <span className="field__label">{copy.skillInputMode}</span>
                  <div className="action-row">
                    <Button
                      aria-pressed={skillInputMode === "gesture_only"}
                      onClick={() => handleSelectSkillInputMode("gesture_only")}
                      variant={skillInputMode === "gesture_only" ? "primary" : "default"}
                    >
                      {copy.skillInputModeGestureOnly}
                    </Button>
                    <Button
                      aria-pressed={skillInputMode === "voice_then_gesture"}
                      onClick={() => handleSelectSkillInputMode("voice_then_gesture")}
                      variant={skillInputMode === "voice_then_gesture" ? "primary" : "default"}
                    >
                      {copy.skillInputModeVoiceThenGesture}
                    </Button>
                  </div>
                  {skillInputMode === "voice_then_gesture" ? (
                    <div className="voice-gate">
                      <StatusBadge tone={skillVoiceArmed ? "success" : "warning"}>
                        {skillVoiceArmed ? copy.skillVoiceGateReady : copy.skillVoiceGateLocked}
                      </StatusBadge>
                      <div className="action-row">
                        <Button
                          disabled={skillVoiceStatus === "listening" || isServerConfirming}
                          onClick={() => handleStartSkillVoiceGate()}
                          variant="primary"
                        >
                          {skillVoiceStatus === "listening"
                            ? copy.skillVoiceGateListening
                            : copy.skillVoiceGateStart}
                        </Button>
                      </div>
                      <Metric
                        label={copy.startupVoiceTranscript}
                        value={skillVoiceTranscript || copy.startupVoiceTranscriptEmpty}
                      />
                      <Metric
                        label={copy.startupVoiceMatchedCommand}
                        value={skillVoiceMatchedCommand ?? copy.startupVoiceNoMatch}
                      />
                    </div>
                  ) : null}
                </div>
                <ProgressMeter
                  current={completedStepCount}
                  label={copy.targetProgress}
                  percent={progressPercent}
                  total={state.input.targetSequence.length}
                />
                <div className="sequence" aria-label={copy.targetSequence}>
                  {state.input.targetSequence.map((gesture, index) => (
                    <span
                      className="sequence__item sequence__item--display"
                      data-state={getGestureStepState(index, state.input.currentStep)}
                      key={`${gesture}-${index}`}
                    >
                      {gesture}
                    </span>
                  ))}
                </div>
                <Metric
                  label={copy.currentStep}
                  value={`${completedStepCount}/${state.input.targetSequence.length}`}
                />
                <Metric label={copy.remainingSteps} value={remainingStepCount} />
                <Metric label={copy.targetProgress} value={`${progressPercent}%`} />
                <Metric
                  label={copy.submissionReadiness}
                  value={getSubmissionReadinessLabel(submissionReadinessState)}
                />
                <Metric
                  label={copy.inputSource}
                  value={getInputSourceLabel(state.input.lastInputSource)}
                />
                <Metric
                  label={copy.handStatus}
                  value={state.input.handDetected ? copy.detected : copy.notDetected}
                />
                <Metric
                  label={copy.confidence}
                  value={`${Math.round(state.input.confidence * 100)}%`}
                />
                <div
                  className="input-feedback"
                  data-state={getLocalFeedbackState(localProgressState)}
                  role="status"
                >
                  <strong>{copy.localInputStatus}</strong>
                  <StatusBadge tone={getLocalProgressTone(localProgressState)}>
                    {getLocalProgressLabel(localProgressState)}
                  </StatusBadge>
                  <span>
                    {getLocalProgressHelp(
                      localProgressState,
                      state.input.localFailureReason,
                      state.input.targetSequence[state.input.currentStep] ?? null
                    )}
                  </span>
                </div>
                <div className="confirmation-strip" data-state={state.input.serverConfirmationStatus}>
                  <strong>{copy.serverDecisionStatus}</strong>
                  <StatusBadge tone={getConfirmationTone(state.input.serverConfirmationStatus)}>
                    {getConfirmationLabel(state.input.serverConfirmationStatus)}
                  </StatusBadge>
                  <span>
                    {getConfirmationHelp(
                      state.input.serverConfirmationStatus,
                      state.input.serverRejectionReason
                    )}
                  </span>
                </div>
                {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
                <div className="action-row">
                  <Button
                    disabled={!isMyTurn || isServerConfirming}
                    onClick={handleSubmitAction}
                    variant="primary"
                  >
                    {isServerConfirming ? copy.serverConfirmPending : copy.submitAction}
                  </Button>
                  <Button
                    disabled={surrenderMutation.isPending || !session}
                    onClick={handleSurrender}
                  >
                    {copy.surrender}
                  </Button>
                </div>
              </Panel>
              <LiveCameraPanel
                canStart={canStartLiveRecognizer}
                currentSource={state.input.lastInputSource}
                observation={liveObservation}
                onStart={handleStartLiveRecognizer}
                onStop={stopLiveRecognizer}
                status={liveRecognizerStatus}
              />
              <Panel title={copy.battleLog}>
                <ol className="log-list">
                  {state.battle.battleLog.length === 0 ? <li>{copy.commandWaiting}</li> : null}
                  {state.battle.battleLog.map((item) => (
                    <li key={`${item.turnNumber}-${item.message}`}>
                      T{item.turnNumber} {item.message}
                    </li>
                  ))}
                </ol>
              </Panel>
              {debugFallbackEnabled ? (
                <DebugFallbackPanel
                  canUseGestureInput={canUseGestureInput}
                  currentSource={state.input.lastInputSource}
                  onReplaySequence={handleRunDeterministicFallback}
                  onResetProgress={() => dispatch({ type: "resetGestureProgress" })}
                  onTriggerGesture={(gesture) => handleGestureInput(gesture, "debug_fallback")}
                  targetSequence={state.input.targetSequence}
                />
              ) : null}
              <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
            </div>
          </>
        ) : null}

        {state.screen === "result" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.battleResult}>
              <div
                className="result-hero"
                data-outcome={getBattleOutcome(state.battle, state.player.playerId)}
              >
                <StatusBadge
                  tone={
                    getBattleOutcome(state.battle, state.player.playerId) === "win" ? "success" : "warning"
                  }
                >
                  {getResultHeadline(state.battle, state.player.playerId)}
                </StatusBadge>
                <strong className="result-hero__headline">
                  {getResultHeadline(state.battle, state.player.playerId)}
                </strong>
                <p className="result-hero__text">
                  {getResultSummary(state.battle, state.player.playerId)}
                </p>
              </div>
              <div className="metric-list">
                <Metric
                  label={copy.winner}
                  value={getParticipantResultLabel(
                    state.battle?.winnerPlayerId ?? null,
                    state.player.playerId
                  )}
                />
                <Metric
                  label={copy.loser}
                  value={getParticipantResultLabel(
                    state.battle?.loserPlayerId ?? null,
                    state.player.playerId
                  )}
                />
                <Metric
                  label={copy.endedReason}
                  value={getEndedReasonText(state.battle?.endedReason ?? null)}
                />
                <Metric
                  label={copy.battleTurns}
                  value={state.battle?.turnNumber ?? "-"}
                />
                <Metric
                  label={copy.ratingChange}
                  value={formatSignedNumber(state.history[0]?.ratingChange ?? 0)}
                />
                <Metric label={copy.playerRating} value={state.player.rating} />
              </div>
              {state.battle ? (
                <div className="renderer-section">
                  <span className="field__label">{copy.rendererPanelResult}</span>
                  <AnimsetRendererSurface
                    animsetId={state.equippedAnimsetId}
                    events={resultRendererEvents}
                    scene="result"
                  />
                </div>
              ) : null}
            </Panel>
            <Panel title={copy.nextAction}>
              <p className="helper-text">{copy.resultNextActionHelp}</p>
              <div className="action-row">
                <Button onClick={handleStartQueue} variant="primary">
                  {copy.rematch}
                </Button>
                <Button onClick={() => handleNavigate("practice")}>{copy.startPracticeMode}</Button>
                <Button onClick={handleOpenHistory}>{copy.viewHistory}</Button>
                <Button onClick={handleGoHome}>{copy.home}</Button>
              </div>
              {state.history[0] ? (
                <div className="result-summary">
                  <strong>{copy.history}</strong>
                  <span>{formatHistorySummary({
                    ...state.history[0],
                    endedReason: state.battle?.endedReason ?? "DISCONNECT"
                  })}</span>
                </div>
              ) : null}
            </Panel>
          </div>
        ) : null}

        {state.screen === "history" ? (
          session ? (
            <div className="surface-grid surface-grid--two">
              <Panel title={copy.ratingSummary}>
                <Metric label={copy.playerRating} value={state.player.rating} />
                <Metric label={copy.currentRank} value={playerLeaderboardEntry?.rank ?? "-"} />
                <Metric label={copy.record} value={`${state.player.wins}W / ${state.player.losses}L`} />
                {leaderboardQuery.isLoading ? (
                  <p className="helper-text">{copy.leaderboardLoading}</p>
                ) : null}
                {leaderboardQuery.isError ? (
                  <p className="status-text">{copy.leaderboardLoadFailed}</p>
                ) : null}
                {!leaderboardQuery.isLoading && !leaderboardQuery.isError ? (
                  <ol className="log-list">
                    {leaderboardEntries.length === 0 ? <li>{copy.noLeaderboard}</li> : null}
                    {leaderboardEntries.slice(0, 5).map((entry) => (
                      <li key={entry.playerId}>
                        {entry.rank}. {entry.nickname} / {entry.rating}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </Panel>
              <Panel title={copy.history}>
                {historyQuery.isLoading ? <p className="helper-text">{copy.historyLoading}</p> : null}
                {historyQuery.isError ? <p className="status-text">{copy.historyLoadFailed}</p> : null}
                {!historyQuery.isLoading && !historyQuery.isError ? (
                  <ol className="log-list">
                    {historyItems.length === 0 ? <li>{copy.noHistory}</li> : null}
                    {historyItems.map((record) => (
                      <li key={`${record.matchId}-${record.playedAt}`}>
                        {formatHistorySummary(record)}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </Panel>
            </div>
          ) : (
            <Panel title={copy.history}>
              <p className="status-text">{copy.historySessionRequired}</p>
            </Panel>
          )
        ) : null}
      </div>
    </section>
  );
}

type ProgressBannerState = {
  actionLabel: string;
  description: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  state: "battle" | "matched" | "result" | "searching";
  variant: "default" | "primary";
};

function getProgressBannerState({
  activeScreen,
  hasActiveBattle,
  hasResultAvailable,
  isMatchFoundWaiting,
  isMatchSearching,
  onCancelQueue,
  onOpenBattle,
  onOpenMatchmaking,
  onOpenResult
}: {
  activeScreen: ScreenKey;
  hasActiveBattle: boolean;
  hasResultAvailable: boolean;
  isMatchFoundWaiting: boolean;
  isMatchSearching: boolean;
  onCancelQueue: () => void;
  onOpenBattle: () => void;
  onOpenMatchmaking: () => void;
  onOpenResult: () => void;
}): ProgressBannerState | null {
  if (hasActiveBattle && activeScreen !== "battle") {
    return {
      actionLabel: copy.returnToBattle,
      description: copy.homeActionHelpBattle,
      label: copy.battleBannerActive,
      onClick: onOpenBattle,
      state: "battle",
      variant: "primary"
    };
  }

  if (isMatchFoundWaiting && activeScreen !== "matchmaking") {
    return {
      actionLabel: copy.viewMatchmaking,
      description: copy.homeActionHelpMatched,
      label: copy.matchingBannerMatched,
      onClick: onOpenMatchmaking,
      state: "matched",
      variant: "primary"
    };
  }

  if (isMatchSearching && activeScreen !== "matchmaking") {
    return {
      actionLabel: copy.cancelQueue,
      description: copy.homeActionHelpQueue,
      label: copy.matchingBannerSearching,
      onClick: onCancelQueue,
      state: "searching",
      variant: "default"
    };
  }

  if (hasResultAvailable && activeScreen !== "result") {
    return {
      actionLabel: copy.viewResult,
      description: copy.homeActionHelpResult,
      label: copy.resultBannerReady,
      onClick: onOpenResult,
      state: "result",
      variant: "default"
    };
  }

  return null;
}

function getProgressBannerTone(
  state: ProgressBannerState["state"]
): "neutral" | "success" | "warning" {
  if (state === "battle") {
    return "warning";
  }
  if (state === "result") {
    return "success";
  }
  return "neutral";
}

function getMatchProgressSteps({
  hasPlayerSession,
  hasConfiguredLoadout,
  socketStatus,
  queueStatus,
  hasActiveBattle
}: {
  hasPlayerSession: boolean;
  hasConfiguredLoadout: boolean;
  socketStatus: BattleFlowState["socketStatus"];
  queueStatus: BattleFlowState["queueStatus"];
  hasActiveBattle: boolean;
}): MatchProgressStep[] {
  return [
    {
      label: copy.matchmakingStepPlayer,
      state: hasPlayerSession ? "done" : "active"
    },
    {
      label: copy.matchmakingStepLoadout,
      state: hasConfiguredLoadout ? "done" : hasPlayerSession ? "active" : "pending"
    },
    {
      label: copy.matchmakingStepSocket,
      state:
        socketStatus === "CONNECTED"
          ? "done"
          : socketStatus === "CONNECTING"
            ? "active"
            : "pending"
    },
    {
      label: copy.matchmakingStepQueue,
      state:
        queueStatus === "MATCHED"
          ? "done"
          : queueStatus === "SEARCHING"
            ? "active"
            : "pending"
    },
    {
      label: copy.matchmakingStepFound,
      state: queueStatus === "MATCHED" ? (hasActiveBattle ? "done" : "active") : "pending"
    },
    {
      label: copy.matchmakingStepBattle,
      state: hasActiveBattle ? "done" : queueStatus === "MATCHED" ? "active" : "pending"
    }
  ];
}

function getStepTone(state: MatchProgressStep["state"]): "neutral" | "success" | "warning" {
  if (state === "done") {
    return "success";
  }
  if (state === "active") {
    return "warning";
  }
  return "neutral";
}

function getStepLabel(state: MatchProgressStep["state"]): string {
  if (state === "done") {
    return copy.progressDone;
  }
  if (state === "active") {
    return copy.progressActive;
  }
  return copy.progressPending;
}

function createClientActionId(): string {
  return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createClientRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function canAcceptLiveGestureInput(state: BattleFlowState): boolean {
  return (
    state.screen === "battle" &&
    state.battle?.status === "ACTIVE" &&
    state.battle.turnOwnerPlayerId === state.player.playerId &&
    state.input.serverConfirmationStatus !== "PENDING"
  );
}

function getSkillVoiceGateCommands(skill: Skill): readonly string[] {
  const presentation = getSkillPresentation(skill);

  return Array.from(new Set([
    ...JAPANESE_STARTUP_COMMANDS,
    "領域展開",
    "りょういきてんかい",
    "료이키 텐카이",
    "료이키텐카이",
    "영역전개",
    "술식 발동",
    "술식기동",
    "術式発動",
    skill.name,
    presentation.koreanName,
    presentation.displayName
  ]));
}

function getSkillVoiceGateLanguage(): string {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ja")) {
    return "ja-JP";
  }

  return "ko-KR";
}

function isVoiceActivatedSkill(skill: Skill): boolean {
  return skill.gestureSequence.includes("domain_seal") || skill.name.includes("領域展開");
}

function isCameraReadyObservation(observation: LiveGestureObservation): boolean {
  return (
    observation.reason !== "unsupported" &&
    observation.reason !== "permission_denied" &&
    observation.reason !== "camera_error"
  );
}

function formatHistorySummary(record: {
  result: "WIN" | "LOSE";
  ratingChange: number;
  turnCount: number;
  endedReason: "HP_ZERO" | "SURRENDER" | "TIMEOUT" | "DISCONNECT";
}): string {
  return `${record.result} / ${formatSignedNumber(record.ratingChange)} / T${record.turnCount} / ${getEndedReasonText(record.endedReason)}`;
}

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function getSkillDisplayName(skill: Skill): string {
  return getSkillPresentation(skill).displayName;
}

function getSkillPresentation(skill: Skill): SkillPresentation {
  const koreanNameMatch = /^한국어명:\s*([^.]*)\.\s*(.*)$/u.exec(skill.description);
  const koreanName = koreanNameMatch?.[1]?.trim() || skill.name;
  const summary = koreanNameMatch?.[2]?.trim() || skill.description;

  return {
    japaneseName: skill.name,
    koreanName,
    summary,
    displayName: `${skill.name} - ${koreanName}`
  };
}

function buildPracticeRendererEvents({
  animsetId,
  completedAtMs,
  playerId,
  practiceExpectedGesture,
  practiceProgress,
  practiceState,
  selectedSkill
}: {
  animsetId: string;
  completedAtMs: number | null;
  playerId: string;
  practiceExpectedGesture: string | null;
  practiceProgress: PracticeProgress;
  practiceState: PracticeState;
  selectedSkill: Skill;
}): RendererEventEnvelope[] {
  const presentation = toRendererSkillPresentation(selectedSkill.skillId, animsetId);

  return [
    {
      payload: {
        animsetId,
        playerId,
        scene: "practice"
      },
      type: "renderer.bootstrap"
    },
    {
      payload: {
        gestureSequence: [...selectedSkill.gestureSequence],
        presentation,
        skillId: selectedSkill.skillId,
        skillName: getSkillDisplayName(selectedSkill)
      },
      type: "practice.skill_selected"
    },
    {
      payload: {
        completedRounds: practiceProgress.completedRounds,
        confidence: practiceProgress.confidence,
        currentStep: practiceProgress.currentStep,
        expectedToken: practiceExpectedGesture,
        handDetected: practiceProgress.handDetected,
        observedToken: practiceProgress.currentGesture,
        progressPercent: getSequenceProgress(
          Math.min(practiceProgress.currentStep, practiceProgress.targetSequence.length),
          practiceProgress.targetSequence.length
        ),
        status: practiceState === "complete" ? "complete" : practiceState === "running" ? "running" : "idle",
        targetLength: practiceProgress.targetSequence.length
      },
      type: "practice.progress_updated"
    },
    ...(completedAtMs
      ? [
          {
            payload: {
              completedAtMs,
              completedRounds: practiceProgress.completedRounds,
              skillId: selectedSkill.skillId
            },
            type: "practice.completed" as const
          }
        ]
      : [])
  ];
}

function buildBattleRendererEvents({
  action,
  animsetId,
  battle,
  playerId,
  ratingChange,
  scene,
  selectedSkill
}: {
  action: RendererActionProjection | null;
  animsetId: string;
  battle: BattleState;
  playerId: string;
  ratingChange: number | null;
  scene: "battle" | "result";
  selectedSkill: Skill;
}): RendererEventEnvelope[] {
  const presentation = toRendererSkillPresentation(selectedSkill.skillId, animsetId);
  const events: RendererEventEnvelope[] = [
    {
      payload: {
        animsetId,
        opponentId: battle.opponent.playerId,
        playerId,
        scene
      },
      type: "renderer.bootstrap"
    },
    {
      payload: {
        actionDeadlineAt: battle.actionDeadlineAt ?? null,
        battleSessionId: battle.battleSessionId,
        matchId: battle.matchId,
        opponent: {
          cooldowns: { ...battle.opponent.cooldowns },
          hp: battle.opponent.hp,
          mana: battle.opponent.mana,
          playerId: battle.opponent.playerId
        },
        presentation,
        selectedSkillId: selectedSkill.skillId,
        selectedSkillName: getSkillDisplayName(selectedSkill),
        self: {
          cooldowns: { ...battle.self.cooldowns },
          hp: battle.self.hp,
          mana: battle.self.mana,
          playerId: battle.self.playerId
        },
        status: battle.status,
        turnNumber: battle.turnNumber,
        turnOwnerPlayerId: battle.turnOwnerPlayerId
      },
      type: "battle.state_snapshot"
    }
  ];

  if (action) {
    events.push({
      payload: {
        actionId: action.actionId,
        actorPlayerId: action.actorPlayerId,
        presentation: action.skillId ? presentation : undefined,
        reason: action.reason,
        result: action.result,
        skillId: action.skillId,
        skillName: action.skillName
      },
      type: "battle.action_resolved"
    });
  }

  if (battle.status === "ENDED") {
    events.push({
      payload: {
        battleSessionId: battle.battleSessionId,
        endedReason: battle.endedReason ?? null,
        loserPlayerId: battle.loserPlayerId ?? null,
        ratingChange,
        resultForPlayer: battle.winnerPlayerId
          ? battle.winnerPlayerId === playerId
            ? "WIN"
            : "LOSE"
          : null,
        winnerPlayerId: battle.winnerPlayerId
      },
      type: "battle.ended"
    });
  }

  return events;
}

function toRendererSkillPresentation(skillId: string, animsetId: string) {
  const presentation = resolveSkillPresentationEntry(skillId, animsetId);

  return {
    animsetId: presentation.animsetId,
    cameraPresetId: presentation.cameraPresetId,
    clipId: presentation.clipId,
    fallbackMode: presentation.fallbackMode,
    impactVfxId: presentation.impactVfxId,
    skillId: presentation.skillId,
    tier: presentation.tier,
    timelineId: presentation.timelineId
  };
}

type PanelProps = {
  title: string;
  children: ReactNode;
};

function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type SkillPresentation = {
  japaneseName: string;
  koreanName: string;
  summary: string;
  displayName: string;
};

function SkillCardContent({
  skill,
  showGestureGuide = false
}: {
  skill: Skill;
  showGestureGuide?: boolean;
}) {
  const presentation = getSkillPresentation(skill);

  return (
    <>
      <strong>{presentation.displayName}</strong>
      <div className="skill-card__summary">{presentation.summary}</div>
      <div className="skill-card__meta">
        <span>
          {copy.damage} {skill.damage}
        </span>
        <span>
          {copy.mana} {skill.manaCost}
        </span>
        <span>
          {copy.cooldown} {skill.cooldownTurn}
        </span>
      </div>
      <div className="skill-card__sequence">{skill.gestureSequence.join(" -> ")}</div>
      {showGestureGuide ? (
        <div className="skill-card__guide">
          {skill.gestureSequence.map((gesture) => (
            <span key={`${skill.skillId}-${gesture}`}>
              {gesture}: {getPracticeGestureGuide(gesture)}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function SkillDetailContent({
  skill,
  selectedCooldownTurns
}: {
  skill: Skill;
  selectedCooldownTurns?: number;
}) {
  const presentation = getSkillPresentation(skill);

  return (
    <div className="skill-detail">
      <div className="skill-detail__header">
        <strong>{presentation.displayName}</strong>
        <span>{skill.skillId}</span>
      </div>
      <div className="metric-list">
        <Metric label={copy.skillJapaneseName} value={presentation.japaneseName} />
        <Metric label={copy.skillKoreanName} value={presentation.koreanName} />
        <Metric label={copy.skillEffectSummary} value={presentation.summary} />
        <Metric label={copy.targetSequence} value={skill.gestureSequence.join(" -> ")} />
        <Metric label={copy.skillGestureCount} value={skill.gestureSequence.length} />
        <Metric label={copy.mana} value={skill.manaCost} />
        <Metric label={copy.damage} value={skill.damage} />
        <Metric label={copy.cooldown} value={skill.cooldownTurn} />
        {typeof selectedCooldownTurns === "number" ? (
          <Metric
            label={copy.skillCooldownStatus}
            value={formatCooldownTurns(selectedCooldownTurns)}
          />
        ) : null}
      </div>
      <div className="skill-detail__section">
        <span className="field__label">{copy.skillGestureGuide}</span>
        <div className="skill-detail__gesture-list">
          {skill.gestureSequence.map((gesture, index) => (
            <div className="skill-detail__gesture" key={`${skill.skillId}-${gesture}-${index}`}>
              <strong>
                {index + 1}. {gesture}
              </strong>
              <span>{getPracticeGestureGuide(gesture)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type StartupVoicePanelProps = {
  commands: readonly string[];
  disabled: boolean;
  matchedCommand: string | null;
  onManualStart: () => void;
  onStart: () => void;
  status: StartupVoiceRecognitionStatus;
  transcript: string;
};

function StartupVoicePanel({
  commands,
  disabled,
  matchedCommand,
  onManualStart,
  onStart,
  status,
  transcript
}: StartupVoicePanelProps) {
  return (
    <Panel title={copy.startupVoicePanel}>
      <div className="startup-voice">
        <div className="startup-voice__header">
          <StatusBadge tone={getStartupVoiceStatusTone(status)}>
            {copy.startupVoiceStatusText[status]}
          </StatusBadge>
          <p className="helper-text">{copy.startupVoiceStatusHelp[status]}</p>
        </div>
        <div className="action-row">
          <Button disabled={disabled || status === "listening"} onClick={onStart} variant="primary">
            {status === "listening" ? copy.startupVoiceListeningAction : copy.startupVoiceStart}
          </Button>
          <Button disabled={disabled} onClick={onManualStart}>
            {copy.startupVoiceManualFallback}
          </Button>
        </div>
        <Metric
          label={copy.startupVoiceTranscript}
          value={transcript || copy.startupVoiceTranscriptEmpty}
        />
        <Metric
          label={copy.startupVoiceMatchedCommand}
          value={matchedCommand ?? copy.startupVoiceNoMatch}
        />
        <div className="startup-voice__commands" aria-label={copy.startupVoiceCommandExamples}>
          {commands.map((command) => (
            <span className="startup-voice__command" key={command}>
              {command}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function getStartupVoiceStatusTone(
  status: StartupVoiceRecognitionStatus
): "neutral" | "success" | "warning" {
  if (status === "matched") {
    return "success";
  }

  if (status === "idle" || status === "listening") {
    return "neutral";
  }

  return "warning";
}

function FighterPanel({
  title,
  hp,
  mana,
  cooldowns,
  isActive = false
}: {
  title: string;
  hp: number;
  mana: number;
  cooldowns: Record<string, number>;
  isActive?: boolean;
}) {
  return (
    <section className="fighter" data-active={isActive}>
      <h2 className="panel__title">{title}</h2>
      <Metric label={copy.hp} value={hp} />
      <Metric label={copy.mana} value={mana} />
      <CooldownList cooldowns={cooldowns} />
    </section>
  );
}

function CooldownList({ cooldowns }: { cooldowns: Record<string, number> }) {
  const activeCooldowns = Object.entries(cooldowns).filter(([, turns]) => turns > 0);

  return (
    <div className="cooldown-list">
      <span className="cooldown-list__label">{copy.activeCooldowns}</span>
      {activeCooldowns.length === 0 ? (
        <span className="cooldown-list__empty">{copy.noActiveCooldowns}</span>
      ) : (
        <ul className="cooldown-list__items">
          {activeCooldowns.map(([skillId, turns]) => (
            <li key={skillId}>{`${findSkill(skillId).name} · ${formatCooldownTurns(turns)}`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressMeter({
  current,
  label,
  percent,
  total
}: {
  current: number;
  label: string;
  percent: number;
  total: number;
}) {
  return (
    <div className="sequence-progress">
      <div className="sequence-progress__label">
        <span>{label}</span>
        <strong>
          {current}/{total}
        </strong>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="sequence-progress__bar"
        role="progressbar"
      >
        <span className="sequence-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DebugPanel({ events, latency }: { events: string[]; latency: number }) {
  return (
    <Panel title={copy.recentEvents}>
      <Metric label={copy.latency} value={formatLatency(latency)} />
      <ol className="log-list">
        {events.length === 0 ? <li>{copy.runtimeIdle}</li> : null}
        {events.map((eventName, index) => (
          <li key={`${eventName}-${index}`}>{eventName}</li>
        ))}
      </ol>
    </Panel>
  );
}

function LiveCameraPanel({
  canStart,
  currentSource,
  observation,
  onStart,
  onStop,
  status
}: {
  canStart: boolean;
  currentSource: GestureInputSource | null;
  observation: LiveGestureObservation | null;
  onStart: () => void;
  onStop: () => void;
  status: LiveGestureRecognizerStatus;
}) {
  const isRunning = status === "starting" || status === "ready";
  const handState = getLiveHandState(observation);

  return (
    <Panel title={copy.liveCameraPanel}>
      <div className="live-camera__header">
        <StatusBadge tone={getLiveRecognizerStatusTone(status)}>
          {getLiveRecognizerStatusLabel(status)}
        </StatusBadge>
      </div>
      <div className="live-hand-state" role="list" aria-label={copy.liveHandState}>
        <LiveHandStateItem
          activeState={handState}
          label={copy.liveHandNoHand}
          state="no_hand"
        />
        <LiveHandStateItem
          activeState={handState}
          label={copy.liveHandUnstable}
          state="unstable"
        />
        <LiveHandStateItem
          activeState={handState}
          label={copy.liveHandRecognized}
          state="recognized"
        />
      </div>
      <div className="metric-list">
        <Metric label={copy.liveCameraStatus} value={getLiveRecognizerStatusLabel(status)} />
        <Metric label={copy.inputSource} value={getInputSourceLabel(currentSource)} />
        <Metric
          label={copy.handStatus}
          value={observation?.handDetected ? copy.detected : copy.notDetected}
        />
        <Metric
          label={copy.liveObservationReason}
          value={
            observation
              ? getLiveObservationReasonLabel(observation.reason)
              : copy.inputSourceWaiting
          }
        />
        <Metric
          label={copy.liveStability}
          value={formatStabilityMs(observation?.stabilityMs ?? 0)}
        />
        <Metric label={copy.currentGesture} value={observation?.token ?? copy.noGesture} />
      </div>
      <div className="live-camera__actions">
        <Button disabled={!canStart || isRunning} onClick={onStart} variant="primary">
          {copy.liveCameraStart}
        </Button>
        <Button disabled={!isRunning} onClick={onStop}>
          {copy.liveCameraStop}
        </Button>
      </div>
    </Panel>
  );
}

type LiveHandState = "waiting" | "no_hand" | "unstable" | "recognized";

function LiveHandStateItem({
  activeState,
  label,
  state
}: {
  activeState: LiveHandState;
  label: string;
  state: Exclude<LiveHandState, "waiting">;
}) {
  const isActive = activeState === state;

  return (
    <div
      aria-current={isActive ? "true" : undefined}
      className="live-hand-state__item"
      data-active={isActive}
      data-state={state}
      role="listitem"
    >
      <strong>{label}</strong>
      <StatusBadge tone={isActive ? getLiveHandStateTone(state) : "neutral"}>
        {isActive ? copy.liveHandActive : copy.liveHandInactive}
      </StatusBadge>
    </div>
  );
}

function DebugFallbackPanel({
  canUseGestureInput,
  currentSource,
  onReplaySequence,
  onResetProgress,
  onTriggerGesture,
  targetSequence
}: {
  canUseGestureInput: boolean;
  currentSource: GestureInputSource | null;
  onReplaySequence: () => void;
  onResetProgress: () => void;
  onTriggerGesture: (gesture: string) => void;
  targetSequence: string[];
}) {
  return (
    <Panel title={copy.debugFallbackPanel}>
      <StatusBadge tone="warning">{copy.debugOnly}</StatusBadge>
      <p className="helper-text">{copy.debugFallbackHelp}</p>
      <Metric label={copy.inputSource} value={getInputSourceLabel(currentSource)} />
      <div className="debug-fallback__actions">
        <Button
          disabled={!canUseGestureInput}
          onClick={onReplaySequence}
          variant="primary"
        >
          {copy.debugFallbackReplay}
        </Button>
        <Button onClick={onResetProgress}>{copy.debugFallbackReset}</Button>
      </div>
      <div className="sequence" aria-label={copy.debugFallbackSequence}>
        {targetSequence.map((gesture, index) => (
          <Button
            disabled={!canUseGestureInput}
            key={`${gesture}-${index}`}
            onClick={() => onTriggerGesture(gesture)}
          >
            {gesture}
          </Button>
        ))}
      </div>
    </Panel>
  );
}

function getSequenceProgress(current: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((current / total) * 100);
}

function getGestureStepState(index: number, currentStep: number): "complete" | "current" | "pending" {
  if (index < currentStep) {
    return "complete";
  }

  return index === currentStep ? "current" : "pending";
}

function getFailureMessage(reason: InputFailureReason | null): string {
  return reason ? copy.failureReasonText[reason] : copy.failureReasonNone;
}

type LocalProgressState = "waiting" | "progressing" | "complete" | "failed" | "reset";
type SubmissionReadinessState = "ready" | "building" | "blocked" | "locked";

function getLocalProgressState(
  reason: InputFailureReason | null,
  completedStepCount: number,
  totalStepCount: number,
  recentEvent: string | null
): LocalProgressState {
  if (recentEvent === "gesture.reset") {
    return "reset";
  }

  if (reason !== null) {
    return "failed";
  }

  if (totalStepCount > 0 && completedStepCount >= totalStepCount) {
    return "complete";
  }

  if (completedStepCount > 0) {
    return "progressing";
  }

  return "waiting";
}

function getLocalFeedbackState(
  progressState: LocalProgressState
): "idle" | "error" | "pending" | "success" {
  if (progressState === "failed") {
    return "error";
  }

  if (progressState === "progressing") {
    return "pending";
  }

  if (progressState === "complete") {
    return "success";
  }

  return "idle";
}

function getLocalProgressTone(
  progressState: LocalProgressState
): "neutral" | "success" | "warning" {
  if (progressState === "failed") {
    return "warning";
  }

  if (progressState === "progressing" || progressState === "complete") {
    return "success";
  }

  return "neutral";
}

function getLocalProgressLabel(progressState: LocalProgressState): string {
  if (progressState === "progressing") {
    return copy.localProgressProgressing;
  }

  if (progressState === "complete") {
    return copy.localProgressComplete;
  }

  if (progressState === "failed") {
    return copy.localProgressFailed;
  }

  if (progressState === "reset") {
    return copy.localProgressReset;
  }

  return copy.localProgressWaiting;
}

function getLocalProgressHelp(
  progressState: LocalProgressState,
  reason: InputFailureReason | null,
  nextGesture: string | null
): string {
  if (progressState === "progressing") {
    return nextGesture
      ? `${copy.localProgressProgressingHelp} 다음 제스처: ${nextGesture}`
      : copy.localProgressProgressingHelp;
  }

  if (progressState === "complete") {
    return copy.localProgressCompleteHelp;
  }

  if (progressState === "failed") {
    return getFailureMessage(reason);
  }

  if (progressState === "reset") {
    return copy.localProgressResetHelp;
  }

  return nextGesture
    ? `${copy.localProgressWaitingHelp} 다음 제스처: ${nextGesture}`
    : copy.localProgressWaitingHelp;
}

function getSubmissionReadinessState(
  failureReason: InputFailureReason | null,
  confirmationStatus: ServerConfirmationStatus,
  rejectionReason: InputFailureReason | null
): SubmissionReadinessState {
  if (confirmationStatus === "PENDING" || failureReason === "server_pending") {
    return "locked";
  }

  if (confirmationStatus === "REJECTED") {
    return rejectionReason === "server_pending" ? "locked" : "blocked";
  }

  if (failureReason === null) {
    return "ready";
  }

  if (failureReason === "sequence_incomplete") {
    return "building";
  }

  return "blocked";
}

function getSubmissionReadinessLabel(state: SubmissionReadinessState): string {
  if (state === "ready") {
    return copy.readinessReady;
  }

  if (state === "building") {
    return copy.readinessBuilding;
  }

  if (state === "locked") {
    return copy.readinessLocked;
  }

  return copy.readinessBlocked;
}

function getInputSourceLabel(source: GestureInputSource | null): string {
  if (source === "debug_fallback") {
    return copy.inputSourceDebugFallback;
  }

  if (source === "live_camera") {
    return copy.inputSourceLiveCamera;
  }

  return copy.inputSourceWaiting;
}

function getLiveRecognizerStatusLabel(status: LiveGestureRecognizerStatus): string {
  return copy.liveRecognizerStatusText[status];
}

function getLiveRecognizerStatusTone(
  status: LiveGestureRecognizerStatus
): "neutral" | "success" | "warning" {
  if (status === "ready") {
    return "success";
  }

  if (status === "blocked" || status === "unsupported" || status === "error") {
    return "warning";
  }

  return "neutral";
}

type PracticeState = "ready" | "running" | "complete";

const HAND_MESH_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17]
];

function getPracticeState(
  status: LiveGestureRecognizerStatus,
  completedStepCount: number,
  totalStepCount: number
): PracticeState {
  if (totalStepCount > 0 && completedStepCount >= totalStepCount) {
    return "complete";
  }

  if (status === "starting" || status === "ready") {
    return "running";
  }

  return "ready";
}

function getPracticeStatusLabel(state: PracticeState): string {
  if (state === "complete") {
    return copy.practiceSkillComplete;
  }

  if (state === "running") {
    return copy.practiceSkillRunning;
  }

  return copy.practiceSkillReady;
}

function getPracticeStatusTone(state: PracticeState): "neutral" | "success" | "warning" {
  if (state === "complete") {
    return "success";
  }

  if (state === "running") {
    return "warning";
  }

  return "neutral";
}

function getPracticeGestureGuide(gesture: string | null): string {
  switch (gesture) {
    case "index_up":
      return "검지를 세우고 손목을 고정해 정면을 향하게 합니다.";
    case "pinch":
      return "엄지와 검지를 모아 집는 모양을 안정적으로 유지합니다.";
    case "blue_orb":
      return "손바닥을 살짝 오므려 구체를 받치는 자세를 만듭니다.";
    case "red_orb":
      return "손을 바깥으로 밀어내듯 펴고 중심을 유지합니다.";
    case "orb_collision":
      return "양손 또는 손의 중심을 모아 충돌시키는 느낌으로 마무리합니다.";
    case "two_finger_cross":
      return "두 손가락 또는 양손 손가락을 교차해 결계 시작 자세를 만듭니다.";
    case "flat_prayer":
      return "양손을 납작하게 모아 기도 자세처럼 중앙에 둡니다.";
    case "shadow_seal":
      return "손을 낮게 두고 그림자를 누르는 듯한 봉인 자세를 유지합니다.";
    case "domain_seal":
      return "마지막 결계 인장 자세를 흔들림 없이 유지합니다.";
    default:
      return "가이드가 준비되지 않은 동작입니다. 화면의 현재 입력 상태를 확인하세요.";
  }
}

function getPracticeRuntimeHelp(
  status: LiveGestureRecognizerStatus,
  observation: LiveGestureObservation | null
): string {
  if (status === "ready" && observation) {
    switch (observation.reason) {
      case "recognized":
        return copy.practiceRuntimeRecognizedHelp;
      case "unstable":
        return copy.practiceRuntimeUnstableHelp;
      case "no_hand":
        return copy.practiceRuntimeNoHandHelp;
      case "permission_denied":
        return copy.practiceRuntimeBlockedHelp;
      case "unsupported":
        return copy.practiceRuntimeUnsupportedHelp;
      case "camera_error":
        return copy.practiceRuntimeErrorHelp;
      case "camera_ready":
        return copy.practiceRuntimeReadyHelp;
    }
  }

  switch (status) {
    case "starting":
      return copy.practiceRuntimeStartingHelp;
    case "ready":
      return copy.practiceRuntimeReadyHelp;
    case "blocked":
      return copy.practiceRuntimeBlockedHelp;
    case "unsupported":
      return copy.practiceRuntimeUnsupportedHelp;
    case "error":
      return copy.practiceRuntimeErrorHelp;
    case "stopped":
      return copy.practiceRuntimeStoppedHelp;
    case "idle":
      return copy.practiceRuntimeIdleHelp;
  }
}

function getLiveObservationReasonLabel(reason: LiveGestureObservation["reason"]): string {
  return copy.liveObservationReasonText[reason];
}

function drawHandMeshOverlay(
  canvas: HTMLCanvasElement | null,
  handLandmarks: LiveGestureLandmark[][]
) {
  if (!canvas) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = window.devicePixelRatio || 1;
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);

  if (handLandmarks.length === 0) {
    if (canvas.width > 0 || canvas.height > 0) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.scale(pixelRatio, pixelRatio);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const landmarks of handLandmarks) {
    context.strokeStyle = "rgba(55, 224, 138, 0.96)";
    context.lineWidth = 3;
    context.shadowColor = "rgba(55, 224, 138, 0.54)";
    context.shadowBlur = 8;

    for (const [fromIndex, toIndex] of HAND_MESH_CONNECTIONS) {
      const from = landmarks[fromIndex];
      const to = landmarks[toIndex];

      if (!from || !to) {
        continue;
      }

      context.beginPath();
      context.moveTo(from.x * width, from.y * height);
      context.lineTo(to.x * width, to.y * height);
      context.stroke();
    }

    context.shadowBlur = 0;
    context.fillStyle = "rgba(148, 255, 193, 0.98)";

    for (const landmark of landmarks) {
      context.beginPath();
      context.arc(landmark.x * width, landmark.y * height, 3.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}

function syncHeldLiveCameraGesture(
  observation: LiveGestureObservation,
  holdTokenRef: { current: string | null }
) {
  if (
    observation.reason !== "recognized" ||
    !observation.handDetected ||
    observation.token === null
  ) {
    holdTokenRef.current = null;
  }
}

function consumeHeldLiveCameraInput(
  input: ReturnType<typeof createLiveCameraInput>,
  holdTokenRef: { current: string | null }
): ReturnType<typeof createLiveCameraInput> | null {
  if (holdTokenRef.current === input.gesture) {
    return null;
  }

  holdTokenRef.current = input.gesture;
  return input;
}

function syncHeldPracticeGesture(
  observation: LiveGestureObservation,
  holdTokenRef: { current: string | null }
) {
  if (
    holdTokenRef.current !== null &&
    (
      observation.reason !== "recognized" ||
      !observation.handDetected ||
      observation.token !== holdTokenRef.current
    )
  ) {
    holdTokenRef.current = null;
  }
}

function getLiveHandState(observation: LiveGestureObservation | null): LiveHandState {
  if (!observation) {
    return "waiting";
  }

  if (observation.reason === "recognized" && observation.token) {
    return "recognized";
  }

  if (observation.reason === "unstable") {
    return "unstable";
  }

  if (observation.reason === "no_hand") {
    return "no_hand";
  }

  return "waiting";
}

function getLiveHandStateTone(
  state: Exclude<LiveHandState, "waiting">
): "neutral" | "success" | "warning" {
  return state === "recognized" ? "success" : "warning";
}

function formatStabilityMs(stabilityMs: number): string {
  return stabilityMs > 0 ? `${Math.round(stabilityMs)}ms` : "-";
}

function getDeadlinePresentation(
  deadlineAt: string | undefined,
  nowMs: number
): {
  label: string;
  tone: "success" | "warning" | "neutral";
} | null {
  if (!deadlineAt) {
    return {
      label: copy.deadlineUnknown,
      tone: "neutral"
    };
  }

  const deadlineMs = Date.parse(deadlineAt);
  if (Number.isNaN(deadlineMs)) {
    return {
      label: copy.deadlineUnknown,
      tone: "neutral"
    };
  }

  const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  if (remainingSeconds <= 0) {
    return {
      label: copy.deadlineExpired,
      tone: "warning"
    };
  }

  return {
    label: `${remainingSeconds}초 남음`,
    tone: remainingSeconds <= 5 ? "warning" : "success"
  };
}

function formatCooldownTurns(turns: number): string {
  return turns > 0 ? `${turns}T` : copy.ready;
}

function getBattleOutcome(
  battle: BattleState | null,
  playerId: string
): "win" | "lose" {
  return battle?.winnerPlayerId === playerId ? "win" : "lose";
}

function getResultHeadline(battle: BattleState | null, playerId: string): string {
  return getBattleOutcome(battle, playerId) === "win" ? copy.resultWinHeadline : copy.resultLoseHeadline;
}

function getResultSummary(battle: BattleState | null, playerId: string): string {
  return getBattleOutcome(battle, playerId) === "win" ? copy.resultWinSummary : copy.resultLoseSummary;
}

function getParticipantResultLabel(
  participantPlayerId: string | null,
  playerId: string
): string {
  if (participantPlayerId === null) {
    return "-";
  }

  return participantPlayerId === playerId ? copy.self : copy.opponent;
}

function getTurnState(isMyTurn: boolean, isServerConfirming: boolean): "mine" | "opponent" | "pending" {
  if (isServerConfirming) {
    return "pending";
  }

  return isMyTurn ? "mine" : "opponent";
}

function getTurnTone(isMyTurn: boolean, isServerConfirming: boolean): "neutral" | "success" | "warning" {
  if (isServerConfirming) {
    return "warning";
  }

  return isMyTurn ? "success" : "warning";
}

function getTurnStatusLabel(isMyTurn: boolean, isServerConfirming: boolean): string {
  if (isServerConfirming) {
    return copy.serverConfirmPending;
  }

  return isMyTurn ? copy.myTurn : copy.opponentTurn;
}

function getTurnHint(isMyTurn: boolean, isServerConfirming: boolean): string {
  if (isServerConfirming) {
    return copy.turnHintPending;
  }

  return isMyTurn ? copy.turnHintMy : copy.turnHintOpponent;
}

function getConfirmationTone(status: ServerConfirmationStatus): "neutral" | "success" | "warning" {
  if (status === "PENDING") {
    return "warning";
  }

  if (status === "CONFIRMED") {
    return "success";
  }

  return status === "REJECTED" ? "warning" : "neutral";
}

function getConfirmationLabel(status: ServerConfirmationStatus): string {
  if (status === "PENDING") {
    return copy.serverConfirmPending;
  }

  if (status === "CONFIRMED") {
    return copy.serverConfirmConfirmed;
  }

  return status === "REJECTED" ? copy.serverConfirmRejected : copy.serverConfirmReady;
}

function getConfirmationHelp(
  status: ServerConfirmationStatus,
  rejectionReason: InputFailureReason | null
): string {
  if (status === "PENDING") {
    return copy.serverConfirmPendingHelp;
  }

  if (status === "CONFIRMED") {
    return copy.serverConfirmConfirmedHelp;
  }

  if (status === "REJECTED") {
    return rejectionReason
      ? `${copy.serverConfirmRejectedHelp} ${getFailureMessage(rejectionReason)}`
      : copy.serverConfirmRejectedHelp;
  }

  return copy.serverConfirmReadyHelp;
}

function getEndedReasonText(
  reason: "HP_ZERO" | "SURRENDER" | "TIMEOUT" | "DISCONNECT" | null
): string {
  if (reason === null) {
    return "-";
  }

  return copy.endedReasonText[reason];
}
