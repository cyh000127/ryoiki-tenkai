import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";

import {
  DEFAULT_ANIMSETS,
  DEFAULT_SKILLSET,
  type BattleState,
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
import {
  DEBUG_FALLBACK_ENABLED,
  createDebugFallbackInput,
  createDeterministicFallbackSequence,
  createLiveCameraInput,
  type GestureInputSource
} from "../../features/gesture-session/model/gestureInput";
import {
  createBrowserLiveGestureRecognizer,
  type LiveGestureObservation,
  type LiveGestureRecognizer,
  type LiveGestureRecognizerStatus
} from "../../features/gesture-session/model/liveGestureRecognizer";
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

const screenOrder: ScreenKey[] = ["home", "loadout", "matchmaking", "battle", "result", "history"];

type PendingAction = {
  actionId: string;
  requestId: string;
  submittedAtMs: number;
};

export function BattleGameWorkspace() {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(battleFlowReducer, initialBattleFlowState);
  const stateRef = useRef(state);
  const socketConnectionRef = useRef<BattleSocketConnection | null>(null);
  const liveRecognizerRef = useRef<LiveGestureRecognizer | null>(null);
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
  const [nowMs, setNowMs] = useState(() => Date.now());

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
    return () => {
      closeBattleSocket(true);
      liveRecognizerRef.current?.stop();
      liveRecognizerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.screen === "battle" && state.battle?.status === "ACTIVE") {
      return;
    }

    stopLiveRecognizer();
  }, [state.battle?.status, state.screen]);

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
    const restoredSkill = restoredSkillset?.skills[0] ?? DEFAULT_SKILLSET.skills[0];

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
  const canUseGestureInput =
    state.screen === "battle" && Boolean(state.battle) && isMyTurn && !isServerConfirming;
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
  const debugFallbackEnabled = DEBUG_FALLBACK_ENABLED;
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

  function handleSubmitAction() {
    const failureReason = getSubmitFailureReason(state);
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
      setStatusMessage(null);
    } catch {
      pendingActionRef.current = null;
      dispatch({ type: "actionRejected", reason: null, latencyMs: 0 });
      setStatusMessage(copy.actionSubmitFailed);
    }
  }

  function handleGestureInput(gesture: string, source: GestureInputSource) {
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
    }
  }

  function handleLiveGestureObservation(
    observation: LiveGestureObservation,
    input: ReturnType<typeof createLiveCameraInput> | null
  ) {
    setLiveObservation(observation);

    if (input && canAcceptLiveGestureInput(stateRef.current)) {
      dispatch({
        type: "receiveGestureInput",
        gesture: input.gesture,
        confidence: input.confidence,
        source: input.source
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
    setLiveObservation(null);
  }

  function handleRunDeterministicFallback() {
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
        const latencyMs = consumePendingActionLatency({
          actionId: event.payload.actionId,
          requestId: event.requestId
        });
        dispatch({
          type: "actionRejected",
          reason: event.payload.reason,
          latencyMs
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

  const playerStatusLabel = isRestoringPlayer
    ? copy.sessionRestoring
    : hasConfiguredLoadout
      ? copy.playerReady
      : hasPlayerSession
        ? copy.loadoutPending
      : copy.playerMissing;
  const playerStatusTone = hasConfiguredLoadout ? "success" : "warning";

  return (
    <section className="play-workspace" aria-label={copy.appTitle}>
      <nav className="play-nav" aria-label="playflow">
        {screenOrder.map((screen) => (
          <button
            aria-current={state.screen === screen ? "page" : undefined}
            className="play-nav__button"
            key={screen}
            onClick={() => dispatch({ type: "go", screen })}
            type="button"
          >
            {copy[screen]}
          </button>
        ))}
      </nav>

      <div className="play-main">
        {state.screen === "home" ? (
          <div className="surface-grid">
            <Panel title={copy.playerRating}>
              <StatusBadge tone={playerStatusTone}>{playerStatusLabel}</StatusBadge>
              <Metric label={copy.playerStatus} value={state.player.nickname} />
              <Metric label={copy.playerRating} value={state.player.rating} />
              <Metric label={copy.record} value={`${state.player.wins}W / ${state.player.losses}L`} />
              <Metric label={copy.skillDetail} value={equippedSkill.name} />
            </Panel>
            <Panel title={copy.matchmaking}>
              <div className="field-stack">
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
                <p className="helper-text">{copy.createGuestHelp}</p>
                {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
                <div className="action-row">
                  <Button
                    disabled={createGuestMutation.isPending}
                    onClick={handleCreateGuest}
                  >
                    {copy.startGuest}
                  </Button>
                  <Button onClick={handleOpenLoadout}>{copy.editLoadout}</Button>
                  <Button
                    disabled={startQueueMutation.isPending}
                    variant="primary"
                    onClick={handleStartQueue}
                  >
                    {copy.startMatch}
                  </Button>
                </div>
              </div>
            </Panel>
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
                    <strong>{skill.name}</strong>
                    <div>{skill.gestureSequence.join(" -> ")}</div>
                    <div>
                      {copy.mana} {skill.manaCost} / {skill.damage}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title={copy.skillDetail}>
              <Metric label={copy.targetSequence} value={selectedSkill.gestureSequence.join(" -> ")} />
              <Metric label={copy.mana} value={selectedSkill.manaCost} />
              <Metric label={copy.cooldown} value={selectedSkill.cooldownTurn} />
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

        {state.screen === "matchmaking" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.matchingStatus}>
              <Metric label={copy.matchingStatus} value={state.queueStatus} />
              <Metric label={copy.socketStatus} value={state.socketStatus} />
              <Metric
                label={copy.cameraStatus}
                value={state.input.cameraReady ? copy.ready : copy.checkRequired}
              />
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
              <Panel title={copy.selectedSkillStatus}>
                <Metric label={copy.skillDetail} value={selectedSkill.name} />
                <Metric label={copy.mana} value={selectedSkill.manaCost} />
                <Metric label={copy.damage} value={selectedSkill.damage} />
                <Metric
                  label={copy.skillCooldownStatus}
                  value={formatCooldownTurns(selectedSkillCooldownTurns)}
                />
                {deadlinePresentation ? (
                  <Metric label={copy.turnDeadline} value={deadlinePresentation.label} />
                ) : null}
              </Panel>
              <Panel title={copy.inputConsole}>
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
            </Panel>
            <Panel title={copy.nextAction}>
              <p className="helper-text">{copy.resultNextActionHelp}</p>
              <div className="action-row">
                <Button onClick={handleStartQueue} variant="primary">
                  {copy.rematch}
                </Button>
                <Button onClick={handleOpenHistory}>{copy.viewHistory}</Button>
                <Button onClick={() => dispatch({ type: "resetBattle" })}>{copy.home}</Button>
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

function getLiveObservationReasonLabel(reason: LiveGestureObservation["reason"]): string {
  return copy.liveObservationReasonText[reason];
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
