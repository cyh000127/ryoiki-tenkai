import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";

import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET, type Skillset } from "../../entities/game/model";
import {
  battleFlowReducer,
  findSkill,
  initialBattleFlowState,
  type InputFailureReason,
  type ServerConfirmationStatus,
  type ScreenKey
} from "../../features/battle-flow/model/battleFlow";
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
  getMyProfile,
  getWsToken,
  leaveMatchmakingQueue,
  listAnimsets,
  listSkillsets,
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
const serverConfirmationDelayMs = 320;

export function BattleGameWorkspace() {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(battleFlowReducer, initialBattleFlowState);
  const socketConnectionRef = useRef<BattleSocketConnection | null>(null);
  const ignoreSocketCloseRef = useRef(false);
  const [nicknameDraft, setNicknameDraft] = useState("local_player");
  const [session, setSession] = useState<PlayerSession | null>(() => loadStoredPlayerSession());
  const [draftSkillsetId, setDraftSkillsetId] = useState(initialBattleFlowState.equippedSkillsetId);
  const [draftSkillId, setDraftSkillId] = useState(initialBattleFlowState.selectedSkillId);
  const [selectedAnimsetId, setSelectedAnimsetId] = useState(initialBattleFlowState.equippedAnimsetId);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      closeBattleSocket(true);
    };
  }, []);

  useEffect(() => {
    if (state.socketStatus === "DISCONNECTED" && socketConnectionRef.current) {
      closeBattleSocket(true);
    }
  }, [state.socketStatus]);

  useEffect(() => {
    if (state.screen !== "battle" || state.input.serverConfirmationStatus !== "PENDING") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      dispatch({ type: "confirmSkill" });
    }, serverConfirmationDelayMs);

    return () => window.clearTimeout(timerId);
  }, [state.input.serverConfirmationStatus, state.screen]);

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

  const isMyTurn = state.battle?.turnOwnerPlayerId === state.player.playerId;
  const isServerConfirming = state.input.serverConfirmationStatus === "PENDING";
  const canUseGestureInput =
    state.screen === "battle" && Boolean(state.battle) && isMyTurn && !isServerConfirming;
  const completedStepCount = Math.min(state.input.currentStep, state.input.targetSequence.length);
  const progressPercent = getSequenceProgress(
    completedStepCount,
    state.input.targetSequence.length
  );
  const isRestoringPlayer = profileQuery.isLoading;
  const hasPlayerSession = session !== null && profileQuery.data !== undefined;
  const hasConfiguredLoadout = profileQuery.data?.loadoutConfigured ?? false;
  const isCatalogLoading = skillsetsQuery.isLoading || animsetsQuery.isLoading;
  const catalogFailed = skillsetsQuery.isError || animsetsQuery.isError;

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

  function handleBattleSocketEvent(event: BattleSocketEvent) {
    if (event.type === "battle.match_ready") {
      dispatch({ type: "queueReady" });
      return;
    }

    if (event.type === "battle.match_found") {
      dispatch({ type: "matchFound" });
      return;
    }

    dispatch({
      type: "battleStarted",
      battle: toBattleState(event.payload.battle)
    });
    setStatusMessage(null);
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
                <p className="turn-hint">{getTurnHint(isMyTurn, isServerConfirming)}</p>
              </div>
              <FighterPanel
                title={copy.opponent}
                hp={state.battle.opponent.hp}
                isActive={!isMyTurn && !isServerConfirming}
                mana={state.battle.opponent.mana}
              />
            </div>
            <div className="surface-grid">
              <Panel title={copy.inputConsole}>
                <ProgressMeter
                  current={completedStepCount}
                  label={copy.targetProgress}
                  percent={progressPercent}
                  total={state.input.targetSequence.length}
                />
                <div className="sequence" aria-label={copy.targetSequence}>
                  {state.input.targetSequence.map((gesture, index) => (
                    <button
                      className="sequence__item"
                      data-state={getGestureStepState(index, state.input.currentStep)}
                      disabled={!canUseGestureInput}
                      key={`${gesture}-${index}`}
                      onClick={() =>
                        dispatch({
                          type: "simulateGestureStep",
                          gesture,
                          confidence: 0.91
                        })
                      }
                      type="button"
                    >
                      {gesture}
                    </button>
                  ))}
                </div>
                <Metric
                  label={copy.currentStep}
                  value={`${completedStepCount}/${state.input.targetSequence.length}`}
                />
                <Metric label={copy.targetProgress} value={`${progressPercent}%`} />
                <Metric
                  label={copy.confidence}
                  value={`${Math.round(state.input.confidence * 100)}%`}
                />
                <div
                  className="input-feedback"
                  data-state={getFeedbackState(state.input.failureReason, isServerConfirming)}
                  role="status"
                >
                  <strong>{copy.inputFeedback}</strong>
                  <span>
                    {isServerConfirming
                      ? copy.serverConfirmPendingHelp
                      : getFailureMessage(state.input.failureReason)}
                  </span>
                </div>
                <div className="confirmation-strip" data-state={state.input.serverConfirmationStatus}>
                  <StatusBadge tone={getConfirmationTone(state.input.serverConfirmationStatus)}>
                    {getConfirmationLabel(state.input.serverConfirmationStatus)}
                  </StatusBadge>
                  <span>{getConfirmationHelp(state.input.serverConfirmationStatus)}</span>
                </div>
                <div className="action-row">
                  <Button
                    disabled={!isMyTurn || isServerConfirming}
                    onClick={() => dispatch({ type: "submitSkill" })}
                    variant="primary"
                  >
                    {isServerConfirming ? copy.serverConfirmPending : copy.submitAction}
                  </Button>
                  {!isMyTurn && !isServerConfirming ? (
                    <Button onClick={() => dispatch({ type: "resolveOpponentTurn" })}>
                      {copy.resolveOpponentTurn}
                    </Button>
                  ) : null}
                  <Button onClick={() => dispatch({ type: "surrender" })}>{copy.surrender}</Button>
                </div>
              </Panel>
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
              <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
            </div>
          </>
        ) : null}

        {state.screen === "result" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.battleResult}>
              <Metric
                label={copy.battleResult}
                value={state.battle?.winnerPlayerId === state.player.playerId ? copy.win : copy.lose}
              />
              <Metric label={copy.ratingChange} value={state.history[0]?.ratingChange ?? 0} />
              <Metric label={copy.playerRating} value={state.player.rating} />
              <div className="action-row">
                <Button onClick={() => dispatch({ type: "startQueue" })} variant="primary">
                  {copy.rematch}
                </Button>
                <Button onClick={() => dispatch({ type: "resetBattle" })}>{copy.home}</Button>
              </div>
            </Panel>
            <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
          </div>
        ) : null}

        {state.screen === "history" ? (
          <Panel title={copy.history}>
            <ol className="log-list">
              {state.history.length === 0 ? <li>{copy.noHistory}</li> : null}
              {state.history.map((record) => (
                <li key={record.matchId}>
                  {record.result} / {record.ratingChange} / {record.turnCount}
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </div>
    </section>
  );
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
  isActive = false
}: {
  title: string;
  hp: number;
  mana: number;
  isActive?: boolean;
}) {
  return (
    <section className="fighter" data-active={isActive}>
      <h2 className="panel__title">{title}</h2>
      <Metric label={copy.hp} value={hp} />
      <Metric label={copy.mana} value={mana} />
    </section>
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

function getFeedbackState(
  reason: InputFailureReason | null,
  isServerConfirming: boolean
): "idle" | "error" | "pending" {
  if (isServerConfirming) {
    return "pending";
  }

  return reason ? "error" : "idle";
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

  return status === "CONFIRMED" ? "success" : "neutral";
}

function getConfirmationLabel(status: ServerConfirmationStatus): string {
  if (status === "PENDING") {
    return copy.serverConfirmPending;
  }

  return status === "CONFIRMED" ? copy.serverConfirmConfirmed : copy.serverConfirmReady;
}

function getConfirmationHelp(status: ServerConfirmationStatus): string {
  if (status === "PENDING") {
    return copy.serverConfirmPendingHelp;
  }

  return status === "CONFIRMED" ? copy.serverConfirmConfirmedHelp : copy.serverConfirmReadyHelp;
}
