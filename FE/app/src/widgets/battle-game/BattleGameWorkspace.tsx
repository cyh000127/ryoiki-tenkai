import { type ReactNode, useReducer } from "react";

import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET } from "../../entities/game/model";
import {
  battleFlowReducer,
  findSkill,
  initialBattleFlowState,
  type ScreenKey
} from "../../features/battle-flow/model/battleFlow";
import { copy } from "../../platform/i18n/catalog";
import { Button } from "../../platform/ui/Button";
import { StatusBadge } from "../../platform/ui/StatusBadge";
import { formatLatency } from "../../shared/time/formatLatency";

const screenOrder: ScreenKey[] = ["home", "loadout", "matchmaking", "battle", "result", "history"];

export function BattleGameWorkspace() {
  const [state, dispatch] = useReducer(battleFlowReducer, initialBattleFlowState);
  const selectedSkill = findSkill(state.selectedSkillId);

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
              <FighterPanel title={copy.self} hp={state.battle.self.hp} mana={state.battle.self.mana} />
              <div className="battle-center">
                <StatusBadge tone={state.battle.turnOwnerPlayerId === state.player.playerId ? "success" : "warning"}>
                  {state.battle.turnOwnerPlayerId === state.player.playerId ? copy.myTurn : copy.opponentTurn}
                </StatusBadge>
              </div>
              <FighterPanel title={copy.opponent} hp={state.battle.opponent.hp} mana={state.battle.opponent.mana} />
            </div>
            <div className="surface-grid">
              <Panel title={copy.currentGesture}>
                <div className="sequence">
                  {state.input.targetSequence.map((gesture, index) => (
                    <button
                      className="sequence__item"
                      data-active={index === state.input.currentStep}
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
                <Metric label={copy.currentStep} value={`${state.input.currentStep}/${state.input.targetSequence.length}`} />
                <Metric label={copy.confidence} value={`${Math.round(state.input.confidence * 100)}%`} />
                <Metric label={copy.rejectedReason} value={state.input.failureReason ?? "-"} />
                <div className="action-row">
                  <Button variant="primary" onClick={() => dispatch({ type: "submitSkill" })}>
                    {copy.submitAction}
                  </Button>
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

function FighterPanel({ title, hp, mana }: { title: string; hp: number; mana: number }) {
  return (
    <section className="fighter">
      <h2 className="panel__title">{title}</h2>
      <Metric label={copy.hp} value={hp} />
      <Metric label={copy.mana} value={mana} />
    </section>
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
