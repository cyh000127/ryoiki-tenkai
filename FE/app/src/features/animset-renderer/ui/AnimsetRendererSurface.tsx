import { useEffect, useRef, useState } from "react";

import { copy } from "../../../platform/i18n/catalog";
import { StatusBadge } from "../../../platform/ui/StatusBadge";
import {
  createAnimsetRenderer,
  resolveAnimsetRendererDefinition,
  resolveFallbackRendererDefinition,
} from "../model/animsetRegistry";
import type {
  AnimsetRendererKind,
  AnimsetRendererPort,
  RendererEventEnvelope,
  RendererScene,
  RendererSkillPresentationPayload,
  RendererStatus,
} from "../model/rendererPort";

type AnimsetRendererSurfaceProps = {
  animsetId: string;
  events: RendererEventEnvelope[];
  scene: RendererScene;
};

export function AnimsetRendererSurface({
  animsetId,
  events,
  scene
}: AnimsetRendererSurfaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<AnimsetRendererPort | null>(null);
  const [loadFailure, setLoadFailure] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RendererStatus>("idle");

  const requestedDefinition = resolveAnimsetRendererDefinition(animsetId);
  const requiresPresentationFallback =
    requestedDefinition.rendererKind === "unity-webgl" && projectedEventsRequireHtmlFallback(events);
  const effectiveDefinition =
    loadFailure || requiresPresentationFallback
      ? resolveFallbackRendererDefinition(requestedDefinition)
      : requestedDefinition;
  const helperText = requiresPresentationFallback
    ? copy.rendererAssetMissing
    : loadFailure
      ? copy.rendererFallbackActivated
      : copy.rendererFallbackHelp;
  const eventSignature = JSON.stringify(events);

  useEffect(() => {
    setLoadFailure(null);
  }, [animsetId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;
    const renderer = createAnimsetRenderer(effectiveDefinition);
    rendererRef.current = renderer;
    setRuntimeStatus(effectiveDefinition.rendererKind === "unity-webgl" ? "loading" : "idle");

    void (async () => {
      try {
        await renderer.mount(host, {
          animsetId: effectiveDefinition.animsetId,
          bridgeMethod: effectiveDefinition.bridgeMethod,
          bridgeTarget: effectiveDefinition.bridgeTarget,
          buildConfigUrl: effectiveDefinition.buildConfigUrl,
          buildVersion: effectiveDefinition.buildVersion,
          fallbackPolicy: effectiveDefinition.fallbackPolicy,
          onBridgeEvent: (event) => {
            if (cancelled) {
              return;
            }

            if (event.type === "renderer.ready") {
              setRuntimeStatus("ready");
              return;
            }

            if (event.type === "renderer.error") {
              setRuntimeStatus("error");
              if (requestedDefinition.rendererKind === "unity-webgl") {
                setLoadFailure(event.payload.message);
              }
              return;
            }

            if (event.type === "renderer.asset_missing") {
              setRuntimeStatus("ready");
            }
          },
          rendererKind: effectiveDefinition.rendererKind,
          scene
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRuntimeStatus("error");
        if (requestedDefinition.rendererKind === "unity-webgl") {
          setLoadFailure(error instanceof Error ? error.message : "Unknown renderer mount error.");
        }
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current = null;
      void renderer.unmount();
    };
  }, [
    effectiveDefinition.animsetId,
    effectiveDefinition.bridgeMethod,
    effectiveDefinition.bridgeTarget,
    effectiveDefinition.buildConfigUrl,
    effectiveDefinition.buildVersion,
    effectiveDefinition.fallbackPolicy,
    effectiveDefinition.rendererKind,
    requestedDefinition.rendererKind,
    scene
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    for (const event of events) {
      renderer.update(event);
    }
    setRuntimeStatus(renderer.getStatus());
  }, [eventSignature, effectiveDefinition.animsetId, scene]);

  return (
    <div className="animset-surface" aria-label={`${copy.rendererSceneText[scene]} ${copy.animset}`}>
      <div className="animset-surface__status">
        <StatusBadge tone={getRendererStatusTone(runtimeStatus)}>
          {copy.rendererStatusText[runtimeStatus]}
        </StatusBadge>
        <StatusBadge tone={effectiveDefinition.rendererKind === "unity-webgl" ? "success" : "neutral"}>
          {copy.rendererKindText[effectiveDefinition.rendererKind]}
        </StatusBadge>
      </div>
      <div className="animset-surface__meta">
        <span>{`${copy.rendererMode}: ${copy.rendererKindText[effectiveDefinition.rendererKind]}`}</span>
        <span>{`${copy.rendererScene}: ${copy.rendererSceneText[scene]}`}</span>
        <span>{`${copy.rendererBuild}: ${requestedDefinition.buildVersion}`}</span>
      </div>
      <div className="animset-surface__viewport" ref={hostRef} />
      <p className="helper-text">{helperText}</p>
      {loadFailure ? <p className="helper-text">{loadFailure}</p> : null}
    </div>
  );
}

function getRendererStatusTone(status: RendererStatus): "neutral" | "success" | "warning" {
  if (status === "ready") {
    return "success";
  }

  if (status === "loading" || status === "error") {
    return "warning";
  }

  return "neutral";
}

function projectedEventsRequireHtmlFallback(events: RendererEventEnvelope[]): boolean {
  return events.some((event) => {
    const presentation = extractPresentation(event);
    return presentation !== null && presentation.fallbackMode !== "unity";
  });
}

function extractPresentation(
  event: RendererEventEnvelope
): RendererSkillPresentationPayload | null {
  switch (event.type) {
    case "practice.skill_selected":
      return event.payload.presentation;
    case "battle.state_snapshot":
      return event.payload.presentation;
    case "battle.action_resolved":
      return event.payload.presentation ?? null;
    default:
      return null;
  }
}
