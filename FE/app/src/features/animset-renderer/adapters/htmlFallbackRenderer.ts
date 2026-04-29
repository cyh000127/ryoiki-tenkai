import type {
  AnimsetRendererPort,
  BattleActionResolvedEvent,
  BattleEndedEvent,
  BattleStateSnapshotEvent,
  PracticeCompletedEvent,
  PracticeProgressUpdatedEvent,
  PracticeSkillSelectedEvent,
  RendererBootstrapEvent,
  RendererEventEnvelope,
  RendererMountOptions,
  RendererSkillPresentationPayload,
  RendererStatus
} from "../model/rendererPort";
import { resolveSkillEffectProfile } from "../../skill-effects/model/skillEffectManifest";

type HtmlFallbackSceneState = {
  action: BattleActionResolvedEvent["payload"] | null;
  battle: BattleStateSnapshotEvent["payload"] | null;
  completed: PracticeCompletedEvent["payload"] | null;
  practice: PracticeProgressUpdatedEvent["payload"] | null;
  scene: RendererBootstrapEvent["payload"]["scene"];
  selectedSkill: PracticeSkillSelectedEvent["payload"] | null;
  summary: BattleEndedEvent["payload"] | null;
};

export function createHtmlFallbackRenderer(): AnimsetRendererPort {
  let host: HTMLElement | null = null;
  let options: RendererMountOptions | null = null;
  let status: RendererStatus = "idle";
  let sceneState: HtmlFallbackSceneState | null = null;

  function setStatus(nextStatus: RendererStatus) {
    status = nextStatus;
  }

  function render() {
    if (!host || !options || !sceneState) {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "animset-runtime animset-runtime--fallback";
    const effectProfile = resolveSkillEffectProfile(getProjectedSkillId(sceneState));
    shell.dataset.effectTone = effectProfile.tone;
    shell.dataset.effectIntensity = effectProfile.intensity;
    shell.dataset.effectActivated = sceneState.completed ? "true" : "false";

    const meta = document.createElement("div");
    meta.className = "animset-runtime__meta";
    meta.append(
      createMetaItem("Renderer", "HTML fallback"),
      createMetaItem("Scene", sceneState.scene),
      createMetaItem("Build", options.buildVersion)
    );

    const viewport = document.createElement("div");
    viewport.className = "animset-runtime__viewport";

    const heading = document.createElement("strong");
    heading.className = "animset-runtime__headline";
    heading.textContent = getRuntimeHeadline(sceneState);

    const timeline = document.createElement("p");
    timeline.className = "animset-runtime__text";
    timeline.textContent = getRuntimeTimelineLabel(sceneState);

    viewport.append(createEffectCue(effectProfile, Boolean(sceneState.completed)), heading, timeline);

    const metricGrid = document.createElement("div");
    metricGrid.className = "animset-runtime__metrics";

    for (const [label, value] of getMetricPairs(sceneState)) {
      metricGrid.append(createMetricCard(label, value));
    }

    shell.append(meta, viewport, metricGrid);
    host.replaceChildren(shell);
  }

  function ensureSceneState(scene: RendererBootstrapEvent["payload"]["scene"]): HtmlFallbackSceneState {
    if (sceneState && sceneState.scene === scene) {
      return sceneState;
    }

    sceneState = {
      action: null,
      battle: null,
      completed: null,
      practice: null,
      scene,
      selectedSkill: null,
      summary: null
    };
    return sceneState;
  }

  return {
    getStatus() {
      return status;
    },
    async mount(target, mountOptions) {
      host = target;
      options = mountOptions;
      ensureSceneState(mountOptions.scene);
      setStatus("ready");
      render();
      mountOptions.onBridgeEvent?.({ type: "renderer.ready" });
    },
    async unmount() {
      host?.replaceChildren();
      host = null;
      options = null;
      sceneState = null;
      setStatus("idle");
    },
    update(event) {
      if (!sceneState) {
        return;
      }

      switch (event.type) {
        case "renderer.bootstrap":
          sceneState = ensureSceneState(event.payload.scene);
          break;
        case "practice.skill_selected":
          sceneState.selectedSkill = event.payload;
          break;
        case "practice.progress_updated":
          sceneState.practice = event.payload;
          break;
        case "practice.completed":
          sceneState.completed = event.payload;
          break;
        case "battle.state_snapshot":
          sceneState.battle = event.payload;
          break;
        case "battle.action_resolved":
          sceneState.action = event.payload;
          break;
        case "battle.ended":
          sceneState.summary = event.payload;
          break;
      }

      render();
    }
  };
}

function createMetaItem(label: string, value: string): HTMLElement {
  const item = document.createElement("span");
  item.className = "animset-runtime__meta-item";
  item.textContent = `${label}: ${value}`;
  return item;
}

function createMetricCard(label: string, value: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "animset-runtime__metric";

  const name = document.createElement("span");
  name.textContent = label;

  const data = document.createElement("strong");
  data.textContent = value;

  card.append(name, data);
  return card;
}

function createEffectCue(
  profile: ReturnType<typeof resolveSkillEffectProfile>,
  activated: boolean
): HTMLElement {
  const cue = document.createElement("div");
  cue.className = "animset-runtime__effect-cue";
  cue.dataset.tone = profile.tone;
  cue.dataset.activated = activated ? "true" : "false";

  const ring = document.createElement("span");
  ring.className = "animset-runtime__effect-ring";

  const core = document.createElement("span");
  core.className = "animset-runtime__effect-core";

  const label = document.createElement("span");
  label.className = "animset-runtime__effect-label";
  label.textContent = activated ? profile.completionLabel : profile.activationLabel;

  cue.append(ring, core, label);
  return cue;
}

function getRuntimeHeadline(state: HtmlFallbackSceneState): string {
  if (state.scene === "practice" && state.selectedSkill) {
    return `${state.selectedSkill.skillName} 연습 타임라인`;
  }
  if (state.scene === "battle" && state.battle) {
    return `${state.battle.selectedSkillName} 전투 타임라인`;
  }
  if (state.scene === "result" && state.summary) {
    return state.summary.resultForPlayer === "WIN" ? "결과 하이라이트 · 승리" : "결과 하이라이트 · 패배";
  }
  return "렌더러 준비 중";
}

function getRuntimeTimelineLabel(state: HtmlFallbackSceneState): string {
  const presentation = getPresentation(state);
  if (!presentation) {
    return "타임라인 대기 중";
  }

  return `${presentation.timelineId} / ${presentation.fallbackMode}`;
}

function getPresentation(state: HtmlFallbackSceneState): RendererSkillPresentationPayload | null {
  if (state.selectedSkill) {
    return state.selectedSkill.presentation;
  }
  if (state.battle) {
    return state.battle.presentation;
  }
  if (state.action?.presentation) {
    return state.action.presentation;
  }
  return null;
}

function getProjectedSkillId(state: HtmlFallbackSceneState): string {
  if (state.selectedSkill) {
    return state.selectedSkill.skillId;
  }
  if (state.action?.skillId) {
    return state.action.skillId;
  }
  if (state.battle) {
    return state.battle.selectedSkillId;
  }
  if (state.completed) {
    return state.completed.skillId;
  }
  return "unknown";
}

function getMetricPairs(state: HtmlFallbackSceneState): Array<[string, string]> {
  const effectProfile = resolveSkillEffectProfile(getProjectedSkillId(state));

  if (state.scene === "practice") {
    const presentation = getPresentation(state);
    return [
      ["Skill", state.selectedSkill?.skillName ?? "-"],
      ["Timeline", presentation?.timelineId ?? "-"],
      ["Effect", effectProfile.effectId],
      ["Step", formatPracticeStep(state.practice)],
      ["Expected", state.practice?.expectedToken ?? "-"],
      ["Observed", state.practice?.observedToken ?? "-"],
      ["Activation", state.completed ? "Triggered" : "Waiting"],
      ["Status", state.practice?.status ?? "idle"]
    ];
  }

  if (state.scene === "battle") {
    return [
      ["Skill", state.battle?.selectedSkillName ?? "-"],
      ["Effect", effectProfile.effectId],
      ["Turn", state.battle ? String(state.battle.turnNumber) : "-"],
      ["Self HP/Mana", formatParticipant(state.battle?.self ?? null)],
      ["Opponent HP/Mana", formatParticipant(state.battle?.opponent ?? null)],
      ["Action", formatAction(state.action)],
      ["Status", state.battle?.status ?? "-"]
    ];
  }

  return [
    ["Outcome", state.summary?.resultForPlayer ?? "-"],
    ["Effect", effectProfile.effectId],
    ["Winner", state.summary?.winnerPlayerId ?? "-"],
    ["Loser", state.summary?.loserPlayerId ?? "-"],
    ["Ended", state.summary?.endedReason ?? "-"],
    ["Rating", state.summary?.ratingChange === null ? "-" : String(state.summary?.ratingChange ?? "-")],
    ["Action", formatAction(state.action)]
  ];
}

function formatPracticeStep(progress: PracticeProgressUpdatedEvent["payload"] | null): string {
  if (!progress) {
    return "-";
  }

  return `${progress.currentStep}/${progress.targetLength}`;
}

function formatParticipant(
  participant: BattleStateSnapshotEvent["payload"]["self"] | null
): string {
  if (!participant) {
    return "-";
  }

  return `${participant.hp} / ${participant.mana}`;
}

function formatAction(action: BattleActionResolvedEvent["payload"] | null): string {
  if (!action) {
    return "-";
  }

  if (action.reason) {
    return `${action.result} / ${action.reason}`;
  }

  return action.result;
}
