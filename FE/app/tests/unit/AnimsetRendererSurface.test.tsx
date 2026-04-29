import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnimsetRendererSurface } from "../../src/features/animset-renderer/ui/AnimsetRendererSurface";
import type { RendererEventEnvelope } from "../../src/features/animset-renderer/model/rendererPort";

function buildPracticeEvents(
  skillId: string,
  fallbackMode: "html-only" | "unity",
  completed = false
): RendererEventEnvelope[] {
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
        status: completed ? "complete" : "running",
        targetLength: 1
      },
      type: "practice.progress_updated"
    },
    ...(completed
      ? [
          {
            payload: {
              completedAtMs: 1777392000000,
              completedRounds: 1,
              skillId
            },
            type: "practice.completed" as const
          }
        ]
      : [])
  ];
}

function buildBattleEvents(
  result: "accepted" | "rejected",
  reason: string | null = null
): RendererEventEnvelope[] {
  return [
    {
      payload: {
        animsetId: "animset_basic_2d",
        opponentId: "pl_opponent",
        playerId: "pl_local",
        scene: "battle"
      },
      type: "renderer.bootstrap"
    },
    {
      payload: {
        actionDeadlineAt: "2026-04-29T00:00:30Z",
        battleSessionId: "battle_renderer",
        matchId: "match_renderer",
        opponent: {
          cooldowns: {},
          hp: result === "accepted" ? 76 : 100,
          mana: 100,
          playerId: "pl_opponent"
        },
        presentation: {
          animsetId: "animset_basic_2d",
          fallbackMode: "html-only",
          skillId: "jjk_gojo_red",
          tier: "hero",
          timelineId: "timeline.gojo.red"
        },
        selectedSkillId: "jjk_gojo_red",
        selectedSkillName: "赫(혁)",
        self: {
          cooldowns: {},
          hp: 100,
          mana: 80,
          playerId: "pl_local"
        },
        status: "ACTIVE",
        turnNumber: 1,
        turnOwnerPlayerId: "pl_local"
      },
      type: "battle.state_snapshot"
    },
    {
      payload: {
        actionId: "action_renderer",
        actorPlayerId: "pl_local",
        presentation: {
          animsetId: "animset_basic_2d",
          fallbackMode: "html-only",
          skillId: "jjk_gojo_red",
          tier: "hero",
          timelineId: "timeline.gojo.red"
        },
        reason,
        result,
        skillId: "jjk_gojo_red",
        skillName: "赫(혁)"
      },
      type: "battle.action_resolved"
    }
  ];
}

function buildResultEvents(): RendererEventEnvelope[] {
  return [
    {
      payload: {
        animsetId: "animset_basic_2d",
        opponentId: "pl_opponent",
        playerId: "pl_local",
        scene: "result"
      },
      type: "renderer.bootstrap"
    },
    {
      payload: {
        actionDeadlineAt: null,
        battleSessionId: "battle_renderer",
        matchId: "match_renderer",
        opponent: {
          cooldowns: {},
          hp: 0,
          mana: 100,
          playerId: "pl_opponent"
        },
        presentation: {
          animsetId: "animset_basic_2d",
          fallbackMode: "html-only",
          skillId: "jjk_gojo_red",
          tier: "hero",
          timelineId: "timeline.gojo.red"
        },
        selectedSkillId: "jjk_gojo_red",
        selectedSkillName: "赫(혁)",
        self: {
          cooldowns: {},
          hp: 100,
          mana: 80,
          playerId: "pl_local"
        },
        status: "ENDED",
        turnNumber: 3,
        turnOwnerPlayerId: "pl_local"
      },
      type: "battle.state_snapshot"
    },
    {
      payload: {
        actionId: "action_renderer",
        actorPlayerId: "pl_local",
        presentation: {
          animsetId: "animset_basic_2d",
          fallbackMode: "html-only",
          skillId: "jjk_gojo_red",
          tier: "hero",
          timelineId: "timeline.gojo.red"
        },
        reason: null,
        result: "accepted",
        skillId: "jjk_gojo_red",
        skillName: "赫(혁)"
      },
      type: "battle.action_resolved"
    },
    {
      payload: {
        battleSessionId: "battle_renderer",
        endedReason: "HP_ZERO",
        loserPlayerId: "pl_opponent",
        ratingChange: 18,
        resultForPlayer: "WIN",
        winnerPlayerId: "pl_local"
      },
      type: "battle.ended"
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

  it("keeps completed practice activation visible in the html fallback renderer", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_basic_2d"
        events={buildPracticeEvents("jjk_sukuna_malevolent_shrine", "html-only", true)}
        scene="practice"
      />
    );

    expect(await screen.findByText("HTML 폴백")).toBeInTheDocument();
    expect(screen.getByText("Triggered")).toBeInTheDocument();
    expect(screen.getByText("complete")).toBeInTheDocument();
  });

  it("projects accepted battle actions into the battle renderer fallback", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_basic_2d"
        events={buildBattleEvents("accepted")}
        scene="battle"
      />
    );

    expect(await screen.findByText("赫(혁) 전투 타임라인")).toBeInTheDocument();
    expect(screen.getByText("timeline.gojo.red / html-only")).toBeInTheDocument();
    expect(screen.getByText("accepted")).toBeInTheDocument();
  });

  it("projects rejected battle actions without showing a false success timeline", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_basic_2d"
        events={buildBattleEvents("rejected", "INVALID_TURN")}
        scene="battle"
      />
    );

    expect(await screen.findByText("赫(혁) 전투 타임라인")).toBeInTheDocument();
    expect(screen.getByText("rejected / INVALID_TURN")).toBeInTheDocument();
  });

  it("replays ended battle summaries on the result renderer fallback", async () => {
    render(
      <AnimsetRendererSurface
        animsetId="animset_basic_2d"
        events={buildResultEvents()}
        scene="result"
      />
    );

    expect(await screen.findByText("결과 하이라이트 · 승리")).toBeInTheDocument();
    expect(screen.getByText("HP_ZERO")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});
