import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete window.createUnityInstance;
  });

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

  it("supports overlay layout for camera compositing", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_unity_jjk"
        events={buildPracticeEvents("jjk_gojo_red", "unity")}
        layout="overlay"
        scene="practice"
      />
    );

    const surface = screen.getByLabelText("연습 애니셋");
    expect(surface).toHaveClass("animset-surface--overlay");
    expect(await screen.findByText("Unity WebGL")).toBeInTheDocument();
  });

  it("falls back to the html renderer with a friendly message when the Unity loader script fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          loaderUrl: "/unity/mock-loader-surface-fail.js",
          productVersion: "prototype-v1"
        }),
        ok: true
      })
    );

    vi.spyOn(document.head, "append").mockImplementation((...nodes: (Node | string)[]) => {
      for (const node of nodes) {
        if (!(node instanceof HTMLScriptElement)) {
          continue;
        }

        queueMicrotask(() => {
          node.onerror?.(new Event("error"));
        });
      }
    });

    render(
      <AnimsetRendererSurface
        animsetId="animset_unity_jjk"
        events={buildPracticeEvents("jjk_gojo_red", "unity")}
        scene="practice"
      />
    );

    expect(await screen.findByText("HTML 폴백")).toBeInTheDocument();
    expect(
      screen.getByText("Unity 연출 로더를 불러오지 못해 기본 연출 화면으로 전환했습니다.")
    ).toBeInTheDocument();
  });
});
