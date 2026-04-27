import { type ReactNode, useEffect, useReducer } from "react";

import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET } from "../../entities/game/model";
import {
  battleFlowReducer,
  findSkill,
  initialBattleFlowState,
  type InputFailureReason,
  type ServerConfirmationStatus,
  type ScreenKey
} from "../../features/battle-flow/model/battleFlow";
import { copy } from "../../platform/i18n/catalog";
import { Button } from "../../platform/ui/Button";
import { StatusBadge } from "../../platform/ui/StatusBadge";
import { formatLatency } from "../../shared/time/formatLatency";

const screenOrder: ScreenKey[] = ["home", "loadout", "matchmaking", "battle", "result", "history"];
const serverConfirmationDelayMs = 320;

export function BattleGameWorkspace() {
  const [state, dispatch] = useReducer(battleFlowReducer, initialBattleFlowState);
  const selectedSkill = findSkill(state.selectedSkillId);
  const isMyTurn = state.battle?.turnOwnerPlayerId === state.player.playerId;
  const isServerConfirming = state.input.serverConfirmationStatus === "PENDING";
  const canUseGestureInput = state.screen === "battle" && Boolean(state.battle) && isMyTurn && !isServerConfirming;
  const completedStepCount = Math.min(state.input.currentStep, state.input.targetSequence.length);
  const progressPercent = getSequenceProgress(completedStepCount, state.input.targetSequence.length);

  useEffect(() => {
    if (state.screen !== "battle" || !isServerConfirming) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      dispatch({ type: "confirmSkill" });
    }, serverConfirmationDelayMs);

    return () => window.clearTimeout(timerId);
  }, [isServerConfirming, state.screen]);

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
              <Metric label={copy.playerRating} value={state.player.rating} />
              <Metric label={copy.record} value={`${state.player.wins}W / ${state.player.losses}L`} />
              <Metric label={copy.skillDetail} value={selectedSkill.name} />
            </Panel>
            <Panel title={copy.matchmaking}>
              <div className="action-row">
                <Button onClick={() => dispatch({ type: "createGuest", nickname: "local_player" })}>
                  {copy.startGuest}
                </Button>
                <Button onClick={() => dispatch({ type: "go", screen: "loadout" })}>
                  {copy.editLoadout}
                </Button>
                <Button variant="primary" onClick={() => dispatch({ type: "startQueue" })}>
                  {copy.startMatch}
                </Button>
              </div>
            </Panel>
            <DebugPanel events={state.recentEvents} latency={state.input.networkLatencyMs} />
          </div>
        ) : null}

        {state.screen === "loadout" ? (
          <div className="surface-grid surface-grid--two">
            <Panel title={copy.loadout}>
              <div className="skill-list">
                {DEFAULT_SKILLSET.skills.map((skill) => (
                  <button
                    aria-pressed={state.selectedSkillId === skill.skillId}
                    className="skill-card"
                    key={skill.skillId}
                    onClick={() => dispatch({ type: "selectSkill", skillId: skill.skillId })}
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
              <Metric label={copy.animset} value={DEFAULT_ANIMSETS[0].name} />
              <Button
                variant="primary"
                onClick={() =>
                  dispatch({
                    type: "equip",
                    skillsetId: DEFAULT_SKILLSET.skillsetId,
                    animsetId: DEFAULT_ANIMSETS[0].animsetId,
                    skillId: selectedSkill.skillId
                  })
                }
              >
                {copy.equipAndQueue}
              </Button>
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
              <div className="action-row">
                <Button variant="primary" onClick={() => dispatch({ type: "matchFound" })}>
                  match.found
                </Button>
                <Button onClick={() => dispatch({ type: "go", screen: "home" })}>
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
              <FighterPanel title={copy.self} hp={state.battle.self.hp} mana={state.battle.self.mana} isActive={isMyTurn && !isServerConfirming} />
              <div className="battle-center" data-state={getTurnState(isMyTurn, isServerConfirming)}>
                <StatusBadge tone={getTurnTone(isMyTurn, isServerConfirming)}>
                  {getTurnStatusLabel(isMyTurn, isServerConfirming)}
                </StatusBadge>
                <Metric label={copy.turnNumber} value={state.battle.turnNumber} />
                <p className="turn-hint">{getTurnHint(isMyTurn, isServerConfirming)}</p>
              </div>
              <FighterPanel title={copy.opponent} hp={state.battle.opponent.hp} mana={state.battle.opponent.mana} isActive={!isMyTurn && !isServerConfirming} />
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
                <Metric label={copy.currentStep} value={`${completedStepCount}/${state.input.targetSequence.length}`} />
                <Metric label={copy.targetProgress} value={`${progressPercent}%`} />
                <Metric label={copy.confidence} value={`${Math.round(state.input.confidence * 100)}%`} />
                <div
                  className="input-feedback"
                  data-state={getFeedbackState(state.input.failureReason, isServerConfirming)}
                  role="status"
                >
                  <strong>{copy.inputFeedback}</strong>
                  <span>{isServerConfirming ? copy.serverConfirmPendingHelp : getFailureMessage(state.input.failureReason)}</span>
                </div>
                <div className="confirmation-strip" data-state={state.input.serverConfirmationStatus}>
                  <StatusBadge tone={getConfirmationTone(state.input.serverConfirmationStatus)}>
                    {getConfirmationLabel(state.input.serverConfirmationStatus)}
                  </StatusBadge>
                  <span>{getConfirmationHelp(state.input.serverConfirmationStatus)}</span>
                </div>
                <div className="action-row">
                  <Button
                    variant="primary"
                    disabled={!isMyTurn || isServerConfirming}
                    onClick={() => dispatch({ type: "submitSkill" })}
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
                <Button variant="primary" onClick={() => dispatch({ type: "startQueue" })}>
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

function FighterPanel({ title, hp, mana, isActive = false }: { title: string; hp: number; mana: number; isActive?: boolean }) {
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
