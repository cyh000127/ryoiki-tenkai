import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnimsetRendererSurface } from "../../src/features/animset-renderer/ui/AnimsetRendererSurface";
import type { RendererEventEnvelope } from "../../src/features/animset-renderer/model/rendererPort";

function buildPracticeEvents(skillId: string, fallbackMode: "html-only" | "unity"): RendererEventEnvelope[] {
  return [
    {
      payload: {
        animsetId: "animset_unity_jjk",
        playerId: "pl_local",
        scene: "practice"
      },
      type: "renderer.bootstrap"
    },
    {
      payload: {
        gestureSequence: ["index_up"],
        presentation: {
          animsetId: "animset_unity_jjk",
          fallbackMode,
          skillId,
          tier: fallbackMode === "unity" ? "hero" : "standard",
          timelineId: fallbackMode === "unity" ? "timeline.gojo.red" : "timeline.sukuna.malevolent_shrine"
        },
        skillId,
        skillName: skillId
      },
      type: "practice.skill_selected"
    },
    {
      payload: {
        completedRounds: 0,
        confidence: 0.84,
        currentStep: 1,
        expectedToken: "index_up",
        handDetected: true,
        observedToken: "index_up",
        progressPercent: 100,
        status: "running",
        targetLength: 1
      },
      type: "practice.progress_updated"
    }
  ];
}

describe("AnimsetRendererSurface", () => {
  it("renders the html fallback surface for classic animsets", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_basic_2d"
        events={buildPracticeEvents("jjk_gojo_red", "unity")}
        scene="practice"
      />
    );

    expect(await screen.findByText("HTML 폴백")).toBeInTheDocument();
    expect(screen.getByText("timeline.gojo.red / unity")).toBeInTheDocument();
  });

  it("drops back to the html renderer when the selected Unity skill has no authored asset", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_unity_jjk"
        events={buildPracticeEvents("jjk_sukuna_malevolent_shrine", "html-only")}
        scene="practice"
      />
    );

    expect(await screen.findByText("HTML 폴백")).toBeInTheDocument();
    expect(
      screen.getByText(
        "일부 스킬 연출 자산이 아직 없어 기본 타임라인으로 표시됩니다."
      )
    ).toBeInTheDocument();
  });
});
