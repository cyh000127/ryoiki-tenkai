import { useReducer } from "react";

import {
  gestureSessionReducer,
  initialGestureSessionState
} from "../../features/gesture-session/model/gestureSession";
import { copy } from "../../platform/i18n/catalog";
import { Button } from "../../platform/ui/Button";
import { StatusBadge } from "../../platform/ui/StatusBadge";
import { formatLatency } from "../../shared/time/formatLatency";

export function GestureConsole() {
  const [state, dispatch] = useReducer(gestureSessionReducer, initialGestureSessionState);

  const commandTone = state.commandStatus === "accepted" ? "success" : "neutral";

  return (
    <section className="gesture-console" aria-label={copy.appTitle}>
      <div className="gesture-console__preview">
        <div className="gesture-console__target">
          <StatusBadge tone={state.isTracking ? "success" : "neutral"}>
            {state.isTracking ? copy.runtimeTracking : copy.runtimeIdle}
          </StatusBadge>
        </div>
      </div>

      <aside className="gesture-console__panel">
        <div className="gesture-console__section">
          <StatusBadge tone={state.isCameraReady ? "success" : "neutral"}>
            {state.isCameraReady ? copy.cameraReady : copy.sessionState}
          </StatusBadge>
          <div className="gesture-console__metric">
            <span>{copy.currentGesture}</span>
            <strong>{state.reading.gestureKey ?? copy.noGesture}</strong>
          </div>
          <div className="gesture-console__metric">
            <span>{copy.confidence}</span>
            <strong>{Math.round(state.reading.confidence * 100)}%</strong>
          </div>
          <div className="gesture-console__metric">
            <span>{copy.latency}</span>
            <strong>{formatLatency(state.reading.latencyMs)}</strong>
          </div>
        </div>

        <div className="gesture-console__section">
          <StatusBadge tone={commandTone}>{copy.commandState}</StatusBadge>
          <div className="gesture-console__metric">
            <span>{copy.commandState}</span>
            <strong>{copy.commandStatusText[state.commandStatus]}</strong>
          </div>
          {state.selectedSkillActionKey ? (
            <div className="gesture-console__metric">
              <span>{copy.acceptedSkill}</span>
              <strong>{state.selectedSkillActionKey}</strong>
            </div>
          ) : null}
          {state.rejectReason ? (
            <div className="gesture-console__metric">
              <span>{copy.rejectedReason}</span>
              <strong>{state.rejectReason}</strong>
            </div>
          ) : null}
        </div>

        <div className="gesture-console__section">
          <div className="gesture-console__actions">
            <Button variant="primary" onClick={() => dispatch({ type: "start" })}>
              {copy.start}
            </Button>
            <Button
              onClick={() => {
                dispatch({
                  type: "detect",
                  gestureKey: "pinch",
                  confidence: 0.91,
                  latencyMs: 42
                });
                dispatch({ type: "accept", skillActionKey: "skill.confirm" });
              }}
            >
              {copy.simulatePinch}
            </Button>
            <Button
              onClick={() => {
                dispatch({
                  type: "detect",
                  gestureKey: "open_palm",
                  confidence: 0.58,
                  latencyMs: 47
                });
                dispatch({ type: "reject", reason: "low_confidence" });
              }}
            >
              {copy.simulateOpenPalm}
            </Button>
            <Button onClick={() => dispatch({ type: "reset" })}>{copy.reset}</Button>
          </div>
        </div>
      </aside>
    </section>
  );
}
