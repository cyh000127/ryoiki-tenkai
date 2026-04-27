import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppProviders } from "../../src/app/AppProviders";
import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET } from "../../src/entities/game/model";
import { BattleGameWorkspace } from "../../src/widgets/battle-game/BattleGameWorkspace";
import type {
  BattleSocketEvent,
  SubmitBattleActionPayload
} from "../../src/platform/api/battleSocket";

type MockSession = {
  playerId: string;
  guestToken: string;
};

type MockProfile = {
  playerId: string;
  nickname: string;
  rating: number;
  wins: number;
  losses: number;
  equippedSkillsetId: string;
  equippedAnimsetId: string;
  loadoutConfigured: boolean;
};

let storedSession: MockSession | null = null;
let socketEventHandler: ((event: BattleSocketEvent) => void) | null = null;
let socketCloseHandler: (() => void) | null = null;
let submittedSocketActions: SubmitBattleActionPayload[] = [];
let socketConnectCount = 0;
let mockMatchHistory: Array<Record<string, unknown>> = [];
let mockLeaderboard: Array<Record<string, unknown>> = [];
let mockHistoryError = false;
let mockLeaderboardError = false;

function createUser() {
  return userEvent.setup();
}

vi.mock("../../src/platform/api/playerSession", () => ({
  loadStoredPlayerSession: () => storedSession,
  savePlayerSession: (session: MockSession) => {
    storedSession = session;
  },
  clearPlayerSession: () => {
    storedSession = null;
  }
}));

vi.mock("../../src/platform/api/battleSocket", async () => {
  const actual = await vi.importActual<typeof import("../../src/platform/api/battleSocket")>(
    "../../src/platform/api/battleSocket"
  );

  return {
    ...actual,
    connectBattleSocket: vi.fn(async ({ onClose, onEvent }) => {
      socketConnectCount += 1;
      socketCloseHandler = onClose;
      socketEventHandler = onEvent;
      return {
        close: () => {
          socketCloseHandler?.();
        },
        sendSubmitAction: (payload: SubmitBattleActionPayload) => {
          submittedSocketActions.push(payload);
        }
      };
    })
  };
});

function renderWorkspace() {
  return render(
    <AppProviders>
      <BattleGameWorkspace />
    </AppProviders>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function installGameApiMock(profile: MockProfile | null = null) {
  let currentProfile = profile;

  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const pathname = new URL(url).pathname;

    if (pathname === "/api/v1/skillsets") {
      return jsonResponse({
        success: true,
        data: [DEFAULT_SKILLSET],
        error: null
      });
    }

    if (pathname === "/api/v1/animsets") {
      return jsonResponse({
        success: true,
        data: DEFAULT_ANIMSETS,
        error: null
      });
    }

    if (pathname === "/api/v1/players/guest" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body)) as { nickname: string };
      currentProfile = {
        playerId: "pl_guest",
        nickname: payload.nickname,
        rating: 1000,
        wins: 0,
        losses: 0,
        equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
        equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
        loadoutConfigured: false
      };
      return jsonResponse(
        {
          success: true,
          data: {
            playerId: "pl_guest",
            guestToken: "gt_guest",
            rating: 1000
          },
          error: null
        },
        201
      );
    }

    if (pathname === "/api/v1/players/me" && init?.method !== "POST") {
      if (currentProfile === null) {
        return jsonResponse(
          {
            success: false,
            data: null,
            error: {
              code: "PLAYER_NOT_FOUND",
              message: "Unknown player."
            }
          },
          404
        );
      }

      return jsonResponse({
        success: true,
        data: currentProfile,
        error: null
      });
    }

    if (pathname === "/api/v1/players/me/loadout" && init?.method === "POST") {
      const payload = JSON.parse(String(init.body)) as {
        skillsetId: string;
        animsetId: string;
      };
      currentProfile = {
        ...(currentProfile ?? {
          playerId: "pl_guest",
          nickname: "local_player",
          rating: 1000,
          wins: 0,
          losses: 0,
          equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
          equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
          loadoutConfigured: false
        }),
        equippedSkillsetId: payload.skillsetId,
        equippedAnimsetId: payload.animsetId,
        loadoutConfigured: true
      };

      return jsonResponse({
        success: true,
        data: {
          playerId: currentProfile.playerId,
          equippedSkillsetId: payload.skillsetId,
          equippedAnimsetId: payload.animsetId,
          loadoutConfigured: true
        },
        error: null
      });
    }

    if (pathname === "/api/v1/ws-token") {
      return jsonResponse({
        success: true,
        data: {
          wsToken: "wst_pl_guest",
          expiresIn: 300
        },
        error: null
      });
    }

    if (pathname === "/api/v1/matchmaking/queue" && init?.method === "POST") {
      return jsonResponse({
        success: true,
        data: {
          queueStatus: "MATCHED",
          queuedAt: "2026-04-27T00:00:00Z",
          matchId: "match_test",
          battleSessionId: "battle_test"
        },
        error: null
      });
    }

    if (pathname === "/api/v1/matchmaking/queue" && init?.method === "DELETE") {
      return jsonResponse({
        success: true,
        data: {
          queueStatus: "IDLE",
          queuedAt: "2026-04-27T00:00:00Z",
          matchId: null,
          battleSessionId: null
        },
        error: null
      });
    }

    if (pathname === "/api/v1/matches/history") {
      if (mockHistoryError) {
        return jsonResponse(
          {
            success: false,
            data: null,
            error: {
              code: "HISTORY_UNAVAILABLE",
              message: "History unavailable."
            }
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        data: mockMatchHistory,
        error: null
      });
    }

    if (pathname === "/api/v1/ratings/leaderboard") {
      if (mockLeaderboardError) {
        return jsonResponse(
          {
            success: false,
            data: null,
            error: {
              code: "LEADERBOARD_UNAVAILABLE",
              message: "Leaderboard unavailable."
            }
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        data: mockLeaderboard,
        error: null
      });
    }

    throw new Error(`Unhandled fetch request: ${pathname}`);
  });
}

function emitSocketEvent(event: BattleSocketEvent) {
  if (!socketEventHandler) {
    throw new Error("Socket event handler is not registered.");
  }

  act(() => {
    socketEventHandler?.(event);
  });
}

describe("BattleGameWorkspace", () => {
  beforeEach(() => {
    storedSession = null;
    socketEventHandler = null;
    socketCloseHandler = null;
    submittedSocketActions = [];
    socketConnectCount = 0;
    mockMatchHistory = [];
    mockLeaderboard = [];
    mockHistoryError = false;
    mockLeaderboardError = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores a saved player and blocks matchmaking until the loadout is saved", async () => {
    const user = createUser();
    storedSession = {
      playerId: "pl_saved",
      guestToken: "gt_saved"
    };
    installGameApiMock({
      playerId: "pl_saved",
      nickname: "saved_player",
      rating: 1040,
      wins: 4,
      losses: 1,
      equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
      equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
      loadoutConfigured: false
    });

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    expect(screen.getByText("로드아웃 저장 필요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));

    expect(screen.getByText("저장된 로드아웃이 있어야 매칭을 시작할 수 있습니다.")).toBeInTheDocument();
  });

  it("renders server-backed history and leaderboard on the history screen", async () => {
    const user = createUser();
    storedSession = {
      playerId: "pl_saved",
      guestToken: "gt_saved"
    };
    mockMatchHistory = [
      {
        matchId: "match_latest",
        battleSessionId: "battle_latest",
        result: "WIN",
        skillsetId: DEFAULT_SKILLSET.skillsetId,
        ratingChange: 18,
        ratingAfter: 1018,
        endedReason: "HP_ZERO",
        turnCount: 4,
        playedAt: "2026-04-27T00:05:00Z"
      }
    ];
    mockLeaderboard = [
      {
        rank: 1,
        playerId: "pl_practice",
        nickname: "Practice Rival",
        rating: 1032
      },
      {
        rank: 2,
        playerId: "pl_saved",
        nickname: "saved_player",
        rating: 1018
      }
    ];
    installGameApiMock({
      playerId: "pl_saved",
      nickname: "saved_player",
      rating: 1018,
      wins: 5,
      losses: 2,
      equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
      equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
      loadoutConfigured: true
    });

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전적" }));

    expect(await screen.findByText("WIN / +18 / T4 / 체력 소진")).toBeInTheDocument();
    expect(screen.getByText("1. Practice Rival / 1032")).toBeInTheDocument();
    expect(screen.getByText("2. saved_player / 1018")).toBeInTheDocument();
  });

  it("shows history and leaderboard error states when their lookups fail", async () => {
    const user = createUser();
    storedSession = {
      playerId: "pl_saved",
      guestToken: "gt_saved"
    };
    mockHistoryError = true;
    mockLeaderboardError = true;
    installGameApiMock({
      playerId: "pl_saved",
      nickname: "saved_player",
      rating: 1000,
      wins: 0,
      losses: 0,
      equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
      equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
      loadoutConfigured: true
    });

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전적" }));

    expect(await screen.findByText("전적을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(await screen.findByText("리더보드를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("creates a guest, saves the loadout, and then enters battle from socket events", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.clear(screen.getByRole("textbox", { name: "닉네임" }));
    await user.type(screen.getByRole("textbox", { name: "닉네임" }), "rookie");
    await user.click(screen.getByRole("button", { name: "게스트 시작" }));

    expect(await screen.findByRole("button", { name: "로드아웃 저장" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "로드아웃 저장" }));

    expect(await screen.findByText("로드아웃이 저장되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("플레이어 준비 완료")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));

    expect(screen.getByText("SEARCHING")).toBeInTheDocument();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T00:00:00Z"));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    expect(screen.getByText("내 턴")).toBeInTheDocument();
    expect(screen.getAllByText("HP")).toHaveLength(2);
    expect(screen.getAllByText("30초 남음").length).toBeGreaterThan(0);
    expect(screen.getAllByText("활성 쿨다운 없음").length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getAllByText("28초 남음").length).toBeGreaterThan(0);
  });

  it("submits a completed gesture sequence and applies server-authoritative battle updates", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.clear(screen.getByRole("textbox", { name: "닉네임" }));
    await user.type(screen.getByRole("textbox", { name: "닉네임" }), "rookie");
    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await user.click(await screen.findByRole("button", { name: "로드아웃 저장" }));
    await user.click(await screen.findByRole("button", { name: "랭크 1대1 매칭" }));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    const debugFallbackPanel = screen
      .getByRole("heading", { name: "디버그 fallback 입력" })
      .closest("section");
    expect(debugFallbackPanel).not.toBeNull();

    await user.click(within(debugFallbackPanel!).getByRole("button", { name: "목표 순서 입력" }));
    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    expect(submittedSocketActions).toHaveLength(1);
    expect(submittedSocketActions[0]).toMatchObject({
      battleSessionId: "battle_test",
      playerId: "pl_guest",
      turnNumber: 1,
      gestureSequence: ["seal_1", "seal_3"]
    });
    expect(screen.getAllByText("서버 확정 대기 중").length).toBeGreaterThan(0);

    emitSocketEvent({
      type: "battle.action_result",
      requestId: submittedSocketActions[0].requestId,
      payload: {
        battleSessionId: "battle_test",
        turnNumber: 1,
        actionId: submittedSocketActions[0].actionId,
        status: "ACCEPTED",
        reason: null,
        battle: null
      }
    });
    emitSocketEvent({
      type: "battle.state_updated",
      payload: {
        battleSessionId: "battle_test",
        sourceActionId: submittedSocketActions[0].actionId,
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 3,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:01:30Z",
          self: {
            playerId: "pl_guest",
            hp: 75,
            mana: 90,
            cooldowns: {
              pulse_strike: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              pulse_strike: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: "pulse_strike dealt 25"
            },
            {
              turnNumber: 2,
              message: "pulse_strike dealt 25"
            }
          ],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    await waitFor(() => {
      expect(screen.getByText("서버 확정 완료")).toBeInTheDocument();
    });
    expect(screen.getAllByText("75")).toHaveLength(2);
    expect(screen.getByText("T1 pulse_strike dealt 25")).toBeInTheDocument();
    expect(screen.getByText("T2 pulse_strike dealt 25")).toBeInTheDocument();
    expect(screen.getByText("파동격 · 1T")).toBeInTheDocument();
    expect(screen.getByText("선택 스킬 상태")).toBeInTheDocument();
  });

  it("keeps debug fallback controls out of the main battle input surface", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.clear(screen.getByRole("textbox", { name: "닉네임" }));
    await user.type(screen.getByRole("textbox", { name: "닉네임" }), "rookie");
    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await user.click(await screen.findByRole("button", { name: "로드아웃 저장" }));
    await user.click(await screen.findByRole("button", { name: "랭크 1대1 매칭" }));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    const inputPanel = screen.getByRole("heading", { name: "입력 콘솔" }).closest("section");
    const debugFallbackPanel = screen
      .getByRole("heading", { name: "디버그 fallback 입력" })
      .closest("section");

    expect(inputPanel).not.toBeNull();
    expect(debugFallbackPanel).not.toBeNull();
    expect(within(inputPanel!).queryByRole("button", { name: "seal_1" })).toBeNull();
    expect(within(debugFallbackPanel!).getByRole("button", { name: "seal_1" })).toBeInTheDocument();
    expect(
      within(debugFallbackPanel!).getByText(
        "개발 및 스모크 테스트 전용 입력입니다. 일반 전투 입력과 분리되어 서버 검증은 그대로 거칩니다."
      )
    ).toBeInTheDocument();
  });

  it("renders timeout reason on the result screen when the server ends the battle", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.clear(screen.getByRole("textbox", { name: "닉네임" }));
    await user.type(screen.getByRole("textbox", { name: "닉네임" }), "rookie");
    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await user.click(await screen.findByRole("button", { name: "로드아웃 저장" }));
    await user.click(await screen.findByRole("button", { name: "랭크 1대1 매칭" }));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    emitSocketEvent({
      type: "battle.timeout",
      payload: {
        battleSessionId: "battle_test",
        turnNumber: 1,
        timedOutPlayerId: "pl_guest",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ENDED",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:31Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [
            {
              turnNumber: 1,
              message: "pl_guest timed out"
            }
          ],
          winnerPlayerId: "pl_practice",
          loserPlayerId: "pl_guest",
          endedReason: "TIMEOUT"
        }
      }
    });
    emitSocketEvent({
      type: "battle.ended",
      payload: {
        battleSessionId: "battle_test",
        winnerPlayerId: "pl_practice",
        loserPlayerId: "pl_guest",
        endedReason: "TIMEOUT",
        ratingChange: -18,
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ENDED",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:00:31Z",
          self: {
            playerId: "pl_guest",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [
            {
              turnNumber: 1,
              message: "pl_guest timed out"
            }
          ],
          winnerPlayerId: "pl_practice",
          loserPlayerId: "pl_guest",
          endedReason: "TIMEOUT"
        }
      }
    });

    expect(await screen.findByRole("heading", { name: "전투 결과" })).toBeInTheDocument();
    expect(screen.getByText("턴 타임아웃")).toBeInTheDocument();
  });

  it("ignores delayed queue and stale battle snapshot events once newer battle state is visible", async () => {
    const user = createUser();
    installGameApiMock({
      playerId: "pl_saved",
      nickname: "saved_player",
      rating: 1000,
      wins: 0,
      losses: 0,
      equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
      equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
      loadoutConfigured: true
    });
    storedSession = {
      playerId: "pl_saved",
      guestToken: "gt_saved"
    };

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_saved",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_saved",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });
    emitSocketEvent({
      type: "battle.state_updated",
      payload: {
        battleSessionId: "battle_test",
        sourceActionId: "act_newer",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 3,
          turnOwnerPlayerId: "pl_saved",
          actionDeadlineAt: "2026-04-27T00:01:30Z",
          self: {
            playerId: "pl_saved",
            hp: 75,
            mana: 90,
            cooldowns: {
              pulse_strike: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              pulse_strike: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: "pulse_strike dealt 25"
            },
            {
              turnNumber: 2,
              message: "pulse_strike dealt 25"
            }
          ],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText("75")).toHaveLength(2);
    });

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_saved",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_saved",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    expect(screen.getAllByText("75")).toHaveLength(2);
    expect(screen.getByText("T1 pulse_strike dealt 25")).toBeInTheDocument();
    expect(screen.queryByText("SEARCHING")).not.toBeInTheDocument();
  });

  it("reconnects and restores the latest active battle snapshot after socket disconnect", async () => {
    const user = createUser();
    installGameApiMock({
      playerId: "pl_saved",
      nickname: "saved_player",
      rating: 1000,
      wins: 0,
      losses: 0,
      equippedSkillsetId: DEFAULT_SKILLSET.skillsetId,
      equippedAnimsetId: DEFAULT_ANIMSETS[0].animsetId,
      loadoutConfigured: true
    });
    storedSession = {
      playerId: "pl_saved",
      guestToken: "gt_saved"
    };

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));

    emitSocketEvent({
      type: "battle.match_ready",
      payload: {
        queueStatus: "SEARCHING",
        queuedAt: "2026-04-27T00:00:00Z"
      }
    });
    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 1,
          turnOwnerPlayerId: "pl_saved",
          actionDeadlineAt: "2026-04-27T00:00:30Z",
          self: {
            playerId: "pl_saved",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          opponent: {
            playerId: "pl_practice",
            hp: 100,
            mana: 100,
            cooldowns: {}
          },
          battleLog: [],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    expect(await screen.findByText("내 턴")).toBeInTheDocument();
    expect(socketConnectCount).toBe(1);

    act(() => {
      socketCloseHandler?.();
    });

    await waitFor(() => {
      expect(socketConnectCount).toBe(2);
    });
    expect(screen.getByText("소켓을 다시 연결하는 중입니다. 최신 전투 상태를 복구합니다.")).toBeInTheDocument();

    emitSocketEvent({
      type: "battle.match_found",
      payload: {
        matchId: "match_test",
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE"
      }
    });
    emitSocketEvent({
      type: "battle.started",
      payload: {
        battleSessionId: "battle_test",
        playerSeat: "PLAYER_ONE",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ACTIVE",
          turnNumber: 3,
          turnOwnerPlayerId: "pl_saved",
          actionDeadlineAt: "2026-04-27T00:01:30Z",
          self: {
            playerId: "pl_saved",
            hp: 75,
            mana: 90,
            cooldowns: {
              pulse_strike: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              pulse_strike: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: "pulse_strike dealt 25"
            },
            {
              turnNumber: 2,
              message: "pulse_strike dealt 25"
            }
          ],
          winnerPlayerId: null,
          loserPlayerId: null,
          endedReason: null
        }
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText("75")).toHaveLength(2);
    });
    expect(screen.getByText("T1 pulse_strike dealt 25")).toBeInTheDocument();
    expect(screen.queryByText("소켓을 다시 연결하는 중입니다. 최신 전투 상태를 복구합니다.")).not.toBeInTheDocument();
  });
});
