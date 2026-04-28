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
const liveRecognizerMock = vi.hoisted(() => {
  type MockLiveRecognizerOptions = {
    getExpectedToken: () => string | null;
    getTargetSequence: () => readonly string[];
    onObservation: (observation: unknown, input: unknown) => void;
    onStatusChange?: (status: string) => void;
  };

  const control = {
    options: null as null | MockLiveRecognizerOptions,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    createBrowserLiveGestureRecognizer: vi.fn((options: MockLiveRecognizerOptions) => {
      control.options = options;
      return {
        start: control.start,
        stop: control.stop
      };
    })
  };

  return control;
});
const startupVoiceMock = vi.hoisted(() => {
  type MockStartupVoiceOptions = {
    onResult: (result: {
      transcript: string;
      matchedCommand: string | null;
      status: "matched" | "rejected";
    }) => void;
    onStatusChange?: (status: string) => void;
  };

  const control = {
    options: null as null | MockStartupVoiceOptions,
    start: vi.fn(async () => true),
    stop: vi.fn(),
    createJapaneseStartupVoiceCommandRecognizer: vi.fn((options: MockStartupVoiceOptions) => {
      control.options = options;
      return {
        start: control.start,
        stop: control.stop
      };
    })
  };

  return control;
});

const defaultSkill = DEFAULT_SKILLSET.skills[0];
const defaultGestureSequence = defaultSkill.gestureSequence;
const defaultGesture = defaultGestureSequence[0];
const defaultSkillLog = `${defaultSkill.skillId} dealt ${defaultSkill.damage}`;
const infiniteVoidSkill =
  DEFAULT_SKILLSET.skills.find((skill) => skill.skillId === "jjk_gojo_infinite_void") ??
  DEFAULT_SKILLSET.skills[2];

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

vi.mock("../../src/features/gesture-session/model/liveGestureRecognizer", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/features/gesture-session/model/liveGestureRecognizer")
  >("../../src/features/gesture-session/model/liveGestureRecognizer");

  return {
    ...actual,
    createBrowserLiveGestureRecognizer: liveRecognizerMock.createBrowserLiveGestureRecognizer
  };
});

vi.mock("../../src/features/gesture-session/model/startupVoiceCommand", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/features/gesture-session/model/startupVoiceCommand")
  >("../../src/features/gesture-session/model/startupVoiceCommand");

  return {
    ...actual,
    createJapaneseStartupVoiceCommandRecognizer:
      startupVoiceMock.createJapaneseStartupVoiceCommandRecognizer
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

async function enterActiveBattle(user: ReturnType<typeof createUser>) {
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
    liveRecognizerMock.options = null;
    liveRecognizerMock.start.mockClear();
    liveRecognizerMock.stop.mockClear();
    liveRecognizerMock.createBrowserLiveGestureRecognizer.mockClear();
    startupVoiceMock.options = null;
    startupVoiceMock.start.mockClear();
    startupVoiceMock.stop.mockClear();
    startupVoiceMock.createJapaneseStartupVoiceCommandRecognizer.mockClear();
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

  it("starts matchmaking from a matched Japanese voice startup command", async () => {
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
      loadoutConfigured: true
    });

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "詠唱 시작" }));

    expect(startupVoiceMock.start).toHaveBeenCalledTimes(1);

    act(() => {
      startupVoiceMock.options?.onResult({
        matchedCommand: "術式起動(술식기동)",
        status: "matched",
        transcript: "術式を起動して"
      });
    });

    expect(screen.getByText("SEARCHING")).toBeInTheDocument();
    await waitFor(() => {
      expect(socketConnectCount).toBe(1);
    });
  });

  it("offers microphone-free start when voice startup is unsupported", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "詠唱 시작" }));

    act(() => {
      startupVoiceMock.options?.onStatusChange?.("unsupported");
    });

    expect(screen.getByText("音声起動未対応")).toBeInTheDocument();
    expect(
      screen.getByText("이 브라우저에서는 음성 인식을 사용할 수 없습니다. 마이크 없이 시작하세요.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "마이크 없이 시작" }));

    expect(await screen.findByRole("button", { name: "로드아웃 저장" })).toBeInTheDocument();
  });

  it("blocks practice room navigation until a player session exists", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "연습" }));

    expect(screen.getByText("계정 생성 후 연습에 들어갈 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByText("술식 연습")).not.toBeInTheDocument();
  });

  it("lets a signed-in player practice a skill with the camera preview", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await screen.findByRole("button", { name: "로드아웃 저장" });
    await user.click(screen.getByRole("button", { name: "연습" }));

    expect(screen.getByText("술식 연습")).toBeInTheDocument();
    expect(screen.getByLabelText("캠 프리뷰")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("캠 프리뷰").closest(".practice-camera") as HTMLElement).getByLabelText(
        "연습 애니셋"
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("赫(혁)").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("문서 기준 고죠 사토루 무하한주술의 밀어내는 폭발 피해.").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("이번 단계")).toBeInTheDocument();
    expect(
      screen.getAllByText("검지를 세우고 손목을 고정해 정면을 향하게 합니다.").length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "연습 시작" }));

    expect(liveRecognizerMock.createBrowserLiveGestureRecognizer).toHaveBeenCalledTimes(1);
    expect(liveRecognizerMock.options?.getExpectedToken()).toBe(defaultGesture);
    expect(liveRecognizerMock.options?.getTargetSequence()).toEqual(defaultGestureSequence);

    act(() => {
      liveRecognizerMock.options?.onStatusChange?.("ready");
      liveRecognizerMock.options?.onObservation(
        {
          token: defaultGesture,
          confidence: 0.92,
          handDetected: true,
          stabilityMs: 700,
          reason: "recognized"
        },
        {
          gesture: defaultGesture,
          confidence: 0.92,
          source: "live_camera"
        }
      );
    });

    expect(screen.getByText("인식 완료")).toBeInTheDocument();
    expect(screen.getAllByText("0/1").length).toBeGreaterThan(0);
    expect(liveRecognizerMock.stop).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "현재 동작 확인" })).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText("술식이 발동되었습니다. 다시 보려면 연습 초기화를 누르세요.")).toBeInTheDocument();
      },
      { timeout: 1500 }
    );
    expect(screen.getAllByText("술식 발동 완료").length).toBeGreaterThan(0);
    expect(screen.queryByText("완료 횟수")).not.toBeInTheDocument();
    expect(screen.getAllByText("1/1").length).toBeGreaterThan(0);
    expect(liveRecognizerMock.stop).not.toHaveBeenCalled();
  });

  it("keeps only permanent destinations in navigation and preserves queue status through a banner", async () => {
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
      loadoutConfigured: true
    });

    renderWorkspace();

    expect(await screen.findByText("saved_player")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "매칭" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전투" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "결과" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));
    await user.click(screen.getByRole("button", { name: "전적" }));

    expect(screen.getByText("매칭 대기 중")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "큐 취소" })).toBeInTheDocument();
  });

  it("separates the practicing skill from the saved matchmaking loadout", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await user.click(await screen.findByRole("button", { name: "로드아웃 저장" }));
    await user.click(screen.getByRole("button", { name: "연습" }));

    expect(screen.getByText("저장된 매칭 로드아웃")).toBeInTheDocument();
    expect(screen.getByText("현재 연습 중인 술식이 저장된 매칭 로드아웃과 동일합니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /허식 자/i }));

    expect(screen.getByText("현재 연습 중인 술식은 저장된 매칭 로드아웃과 다릅니다.")).toBeInTheDocument();
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
      .getByRole("heading", { name: "개발용 대체 입력" })
      .closest("section");
    expect(debugFallbackPanel).not.toBeNull();

    await user.click(within(debugFallbackPanel!).getByRole("button", { name: "목표 순서 입력" }));
    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    expect(submittedSocketActions).toHaveLength(1);
    expect(submittedSocketActions[0]).toMatchObject({
      battleSessionId: "battle_test",
      playerId: "pl_guest",
      turnNumber: 1,
      gestureSequence: defaultGestureSequence
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
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
              message: defaultSkillLog
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
    expect(screen.getAllByText(`${defaultGestureSequence.length}/${defaultGestureSequence.length}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText("75")).toHaveLength(2);
    expect(screen.getByText(`T1 ${defaultSkillLog}`)).toBeInTheDocument();
    expect(screen.getByText(`T2 ${defaultSkillLog}`)).toBeInTheDocument();
    expect(screen.getByText("赫(혁) · 1T")).toBeInTheDocument();
    expect(screen.getByText("선택 스킬 상태")).toBeInTheDocument();
  });

  it("ignores a delayed duplicate rejected action result after server state confirmation", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await enterActiveBattle(user);

    const debugFallbackPanel = screen
      .getByRole("heading", { name: "개발용 대체 입력" })
      .closest("section");
    expect(debugFallbackPanel).not.toBeNull();

    await user.click(within(debugFallbackPanel!).getByRole("button", { name: "목표 순서 입력" }));
    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    expect(submittedSocketActions).toHaveLength(1);
    const submittedAction = submittedSocketActions[0];
    expect(screen.getAllByText("서버 확정 대기 중").length).toBeGreaterThan(0);

    emitSocketEvent({
      type: "battle.state_updated",
      payload: {
        battleSessionId: "battle_test",
        sourceActionId: submittedAction.actionId,
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
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
              message: defaultSkillLog
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

    emitSocketEvent({
      type: "battle.action_result",
      requestId: submittedAction.requestId,
      payload: {
        battleSessionId: "battle_test",
        turnNumber: 1,
        actionId: submittedAction.actionId,
        status: "REJECTED",
        reason: "DUPLICATE_ACTION",
        battle: null
      }
    });

    expect(screen.getByText("서버 확정 완료")).toBeInTheDocument();
    expect(screen.queryByText("서버 거부")).not.toBeInTheDocument();
    expect(screen.getAllByText("75")).toHaveLength(2);
  });

  it("separates local sequence progress from server rejection feedback", async () => {
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
      .getByRole("heading", { name: "개발용 대체 입력" })
      .closest("section");
    const localFeedback = screen.getByText("로컬 입력 상태").closest("div");
    const serverFeedback = screen.getByText("서버 판정 상태").closest("div");
    const readinessMetric = screen.getByText("제출 준비").closest("div");

    expect(debugFallbackPanel).not.toBeNull();
    expect(localFeedback).not.toBeNull();
    expect(serverFeedback).not.toBeNull();
    expect(readinessMetric).not.toBeNull();

    expect(within(localFeedback!).getByText("대기")).toBeInTheDocument();
    expect(within(readinessMetric!).getByText("순서 입력 중")).toBeInTheDocument();

    await user.click(within(debugFallbackPanel!).getByRole("button", { name: defaultGesture }));
    expect(within(localFeedback!).getByText("입력 완료")).toBeInTheDocument();
    expect(within(readinessMetric!).getByText("제출 가능")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    emitSocketEvent({
      type: "battle.action_result",
      requestId: submittedSocketActions[0].requestId,
      payload: {
        battleSessionId: "battle_test",
        turnNumber: 1,
        actionId: submittedSocketActions[0].actionId,
        status: "REJECTED",
        reason: "INVALID_TURN",
        battle: null
      }
    });

    expect(within(localFeedback!).getByText("입력 완료")).toBeInTheDocument();
    expect(within(serverFeedback!).getByText("서버 거부")).toBeInTheDocument();
    expect(
      within(serverFeedback!).getByText(/상대 턴에는 입력할 수 없습니다\./)
    ).toBeInTheDocument();
    expect(within(readinessMetric!).getByText("제출 불가")).toBeInTheDocument();
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
      .getByRole("heading", { name: "개발용 대체 입력" })
      .closest("section");

    expect(inputPanel).not.toBeNull();
    expect(debugFallbackPanel).not.toBeNull();
    expect(within(inputPanel!).queryByRole("button", { name: defaultGesture })).toBeNull();
    expect(within(debugFallbackPanel!).getByRole("button", { name: defaultGesture })).toBeInTheDocument();
    expect(
      within(debugFallbackPanel!).getByText(
        "개발 및 스모크 테스트 전용 입력입니다. 일반 전투 입력과 분리되어 서버 검증은 그대로 거칩니다."
      )
    ).toBeInTheDocument();
  });

  it("automatically starts voice approval in voice-then-gesture mode before accepting gesture input", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();
    await enterActiveBattle(user);

    await user.click(screen.getByRole("button", { name: "음성 후 손동작" }));

    await waitFor(() => {
      expect(startupVoiceMock.start).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("음성 승인 필요")).toBeInTheDocument();

    const debugFallbackPanel = screen
      .getByRole("heading", { name: "개발용 대체 입력" })
      .closest("section");
    expect(debugFallbackPanel).not.toBeNull();

    const replayButton = within(debugFallbackPanel!).getByRole("button", { name: "목표 순서 입력" });
    expect(replayButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));
    expect(screen.getByText("음성 승인 후 손동작을 입력할 수 있습니다.")).toBeInTheDocument();

    act(() => {
      startupVoiceMock.options?.onResult({
        matchedCommand: "術式起動(술식기동)",
        status: "matched",
        transcript: "術式起動"
      });
    });

    expect(screen.getByText("손동작 입력 가능")).toBeInTheDocument();
    expect(replayButton).not.toBeDisabled();

    await user.click(replayButton);
    expect(screen.getAllByText(`${defaultGestureSequence.length}/${defaultGestureSequence.length}`).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));
    expect(submittedSocketActions).toHaveLength(1);

    await waitFor(() => {
      expect(screen.getByText("음성 승인 필요")).toBeInTheDocument();
    });
    expect(replayButton).toBeDisabled();
  });

  it("automatically uses voice-then-gesture flow for domain skills and chains stt to gesture submission", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await user.clear(screen.getByRole("textbox", { name: "닉네임" }));
    await user.type(screen.getByRole("textbox", { name: "닉네임" }), "rookie");
    await user.click(screen.getByRole("button", { name: "게스트 시작" }));
    await user.click(screen.getByRole("button", { name: /무량공처/i }));
    await user.click(screen.getByRole("button", { name: "로드아웃 저장" }));
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

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "음성 후 손동작" })
      ).toHaveAttribute("aria-pressed", "true");
    });
    await waitFor(() => {
      expect(startupVoiceMock.start).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(liveRecognizerMock.start).toHaveBeenCalledTimes(1);
    });

    act(() => {
      startupVoiceMock.options?.onResult({
        matchedCommand: "領域展開(영역전개)",
        status: "matched",
        transcript: "りょういきてんかい"
      });
    });

    expect(screen.getByText("손동작 입력 가능")).toBeInTheDocument();

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: infiniteVoidSkill.gestureSequence[0],
          confidence: 0.93,
          handDetected: true,
          stabilityMs: 720,
          reason: "recognized"
        },
        {
          gesture: infiniteVoidSkill.gestureSequence[0],
          confidence: 0.93,
          source: "live_camera"
        }
      );
    });

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: infiniteVoidSkill.gestureSequence[1],
          confidence: 0.95,
          handDetected: true,
          stabilityMs: 760,
          reason: "recognized"
        },
        {
          gesture: infiniteVoidSkill.gestureSequence[1],
          confidence: 0.95,
          source: "live_camera"
        }
      );
    });

    expect(
      screen.getAllByText(`${infiniteVoidSkill.gestureSequence.length}/${infiniteVoidSkill.gestureSequence.length}`).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));
    expect(submittedSocketActions).toHaveLength(1);
  });

  it("routes live camera observations through the normalized gesture input boundary", async () => {
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

    const liveCameraPanel = screen
      .getByRole("heading", { name: "라이브 카메라 입력" })
      .closest("section");
    const inputPanel = screen.getByRole("heading", { name: "입력 콘솔" }).closest("section");

    expect(liveCameraPanel).not.toBeNull();
    expect(inputPanel).not.toBeNull();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 시작" }));

    expect(liveRecognizerMock.createBrowserLiveGestureRecognizer).toHaveBeenCalledTimes(1);
    expect(liveRecognizerMock.start).toHaveBeenCalledTimes(1);
    expect(liveRecognizerMock.options?.getExpectedToken()).toBe(defaultGesture);
    expect(liveRecognizerMock.options?.getTargetSequence()).toEqual(defaultGestureSequence);

    act(() => {
      liveRecognizerMock.options?.onStatusChange?.("ready");
    });

    await waitFor(() => {
      expect(within(liveCameraPanel!).getAllByText("준비됨").length).toBeGreaterThan(0);
    });

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: defaultGesture,
          confidence: 0.92,
          handDetected: true,
          stabilityMs: 700,
          reason: "recognized"
        },
        {
          gesture: defaultGesture,
          confidence: 0.92,
          source: "live_camera"
        }
      );
    });

    expect(within(liveCameraPanel!).getByText("토큰 인식")).toBeInTheDocument();
    expect(within(liveCameraPanel!).getByText("700ms")).toBeInTheDocument();
    expect(within(inputPanel!).getByText("입력 완료")).toBeInTheDocument();
    expect(within(inputPanel!).getByText("라이브 카메라")).toBeInTheDocument();
    expect(within(inputPanel!).getByText("92%")).toBeInTheDocument();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 중지" }));

    expect(liveRecognizerMock.stop).toHaveBeenCalledTimes(1);
  });

  it("keeps the completed battle input state while the same live gesture is still being held", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();
    await enterActiveBattle(user);

    const liveCameraPanel = screen
      .getByRole("heading", { name: "라이브 카메라 입력" })
      .closest("section");
    const inputPanel = screen.getByRole("heading", { name: "입력 콘솔" }).closest("section");

    expect(liveCameraPanel).not.toBeNull();
    expect(inputPanel).not.toBeNull();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 시작" }));
    const currentStepMetric = within(inputPanel!).getByText("현재 단계").closest("div");

    expect(currentStepMetric).not.toBeNull();

    act(() => {
      liveRecognizerMock.options?.onStatusChange?.("ready");
      liveRecognizerMock.options?.onObservation(
        {
          token: defaultGesture,
          confidence: 0.92,
          handDetected: true,
          stabilityMs: 700,
          reason: "recognized"
        },
        {
          gesture: defaultGesture,
          confidence: 0.92,
          source: "live_camera"
        }
      );
    });

    expect(within(inputPanel!).getByText("입력 완료")).toBeInTheDocument();
    expect(within(currentStepMetric!).getByText("1/1")).toBeInTheDocument();

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: defaultGesture,
          confidence: 0.93,
          handDetected: true,
          stabilityMs: 1120,
          reason: "recognized"
        },
        {
          gesture: defaultGesture,
          confidence: 0.93,
          source: "live_camera"
        }
      );
    });

    expect(within(inputPanel!).getByText("입력 완료")).toBeInTheDocument();
    expect(within(currentStepMetric!).getByText("1/1")).toBeInTheDocument();
    expect(
      within(inputPanel!).queryByText("목표 순서와 달라 처음부터 다시 입력하세요.")
    ).not.toBeInTheDocument();
  });

  it("stops the live recognizer when the battle workspace unmounts", async () => {
    const user = createUser();
    installGameApiMock();

    const { unmount } = renderWorkspace();
    await enterActiveBattle(user);

    const liveCameraPanel = screen
      .getByRole("heading", { name: "라이브 카메라 입력" })
      .closest("section");
    expect(liveCameraPanel).not.toBeNull();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 시작" }));
    expect(liveRecognizerMock.start).toHaveBeenCalledTimes(1);

    unmount();

    expect(liveRecognizerMock.stop).toHaveBeenCalledTimes(1);
  });

  it("separates live no-hand, unstable-hand, and recognized-token states", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();
    await enterActiveBattle(user);

    const liveCameraPanel = screen
      .getByRole("heading", { name: "라이브 카메라 입력" })
      .closest("section");

    expect(liveCameraPanel).not.toBeNull();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 시작" }));

    act(() => {
      liveRecognizerMock.options?.onStatusChange?.("ready");
    });

    const handStateList = within(liveCameraPanel!).getByRole("list", { name: "손 상태" });
    const noHandState = within(handStateList).getByText("손 없음").closest(".live-hand-state__item");
    const unstableState = within(handStateList).getByText("안정화").closest(".live-hand-state__item");
    const recognizedState = within(handStateList)
      .getByText("인식 토큰")
      .closest(".live-hand-state__item");

    expect(noHandState).not.toBeNull();
    expect(unstableState).not.toBeNull();
    expect(recognizedState).not.toBeNull();

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: null,
          confidence: 0,
          handDetected: false,
          stabilityMs: 0,
          reason: "no_hand"
        },
        null
      );
    });

    await waitFor(() => {
      expect(noHandState).toHaveAttribute("data-active", "true");
    });
    expect(unstableState).toHaveAttribute("data-active", "false");
    expect(recognizedState).toHaveAttribute("data-active", "false");
    expect(within(liveCameraPanel!).getAllByText("손 없음").length).toBeGreaterThan(0);

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: null,
          confidence: 0.48,
          handDetected: true,
          stabilityMs: 240,
          reason: "unstable"
        },
        null
      );
    });

    await waitFor(() => {
      expect(unstableState).toHaveAttribute("data-active", "true");
    });
    expect(noHandState).toHaveAttribute("data-active", "false");
    expect(recognizedState).toHaveAttribute("data-active", "false");
    expect(within(liveCameraPanel!).getByText("안정화 중")).toBeInTheDocument();

    act(() => {
      liveRecognizerMock.options?.onObservation(
        {
          token: defaultGesture,
          confidence: 0.92,
          handDetected: true,
          stabilityMs: 700,
          reason: "recognized"
        },
        {
          gesture: defaultGesture,
          confidence: 0.92,
          source: "live_camera"
        }
      );
    });

    await waitFor(() => {
      expect(recognizedState).toHaveAttribute("data-active", "true");
    });
    expect(noHandState).toHaveAttribute("data-active", "false");
    expect(unstableState).toHaveAttribute("data-active", "false");
    expect(within(liveCameraPanel!).getByText(defaultGesture)).toBeInTheDocument();
  });

  it("shows blocked live camera state without entering action submission", async () => {
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

    const liveCameraPanel = screen
      .getByRole("heading", { name: "라이브 카메라 입력" })
      .closest("section");
    const inputPanel = screen.getByRole("heading", { name: "입력 콘솔" }).closest("section");

    expect(liveCameraPanel).not.toBeNull();
    expect(inputPanel).not.toBeNull();

    await user.click(within(liveCameraPanel!).getByRole("button", { name: "카메라 시작" }));

    act(() => {
      liveRecognizerMock.options?.onStatusChange?.("blocked");
    });

    await waitFor(() => {
      expect(within(liveCameraPanel!).getAllByText("권한 차단").length).toBeGreaterThan(0);
    });
    expect(within(inputPanel!).getByText("순서 입력 중")).toBeInTheDocument();
    expect(submittedSocketActions).toHaveLength(0);
  });

  it("renders timeout reason on the result screen when the server ends the battle", async () => {
    const user = createUser();
    mockMatchHistory = [
      {
        matchId: "match_test",
        battleSessionId: "battle_test",
        result: "LOSE",
        skillsetId: DEFAULT_SKILLSET.skillsetId,
        ratingChange: -18,
        ratingAfter: 982,
        endedReason: "TIMEOUT",
        turnCount: 1,
        playedAt: "2026-04-27T00:01:00Z"
      }
    ];
    mockLeaderboard = [
      {
        rank: 1,
        playerId: "pl_practice",
        nickname: "Practice Rival",
        rating: 1018
      },
      {
        rank: 2,
        playerId: "pl_guest",
        nickname: "rookie",
        rating: 982
      }
    ];
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
    expect(screen.getAllByText("패배").length).toBeGreaterThan(0);
    expect(screen.getByText("턴 타임아웃")).toBeInTheDocument();
    expect(screen.getAllByText("-18").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "전적 보기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "전적 보기" }));

    expect(await screen.findByText("LOSE / -18 / T1 / 턴 타임아웃")).toBeInTheDocument();
    expect(screen.getByText("2. rookie / 982")).toBeInTheDocument();
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
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
              message: defaultSkillLog
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
    expect(screen.getByText(`T1 ${defaultSkillLog}`)).toBeInTheDocument();
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
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
              message: defaultSkillLog
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
    expect(screen.getByText(`T1 ${defaultSkillLog}`)).toBeInTheDocument();
    expect(screen.queryByText("소켓을 다시 연결하는 중입니다. 최신 전투 상태를 복구합니다.")).not.toBeInTheDocument();
  });

  it("reconnects and restores an ended battle replay into the result screen", async () => {
    const user = createUser();
    installGameApiMock();

    renderWorkspace();

    await enterActiveBattle(user);
    expect(await screen.findByText("내 턴")).toBeInTheDocument();
    expect(socketConnectCount).toBe(1);

    act(() => {
      socketCloseHandler?.();
    });

    await waitFor(() => {
      expect(socketConnectCount).toBe(2);
    });

    emitSocketEvent({
      type: "battle.timeout",
      payload: {
        battleSessionId: "battle_test",
        turnNumber: 2,
        timedOutPlayerId: "pl_guest",
        battle: {
          battleSessionId: "battle_test",
          matchId: "match_test",
          status: "ENDED",
          turnNumber: 2,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:01:00Z",
          self: {
            playerId: "pl_guest",
            hp: 75,
            mana: 90,
            cooldowns: {
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
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
          turnNumber: 2,
          turnOwnerPlayerId: "pl_guest",
          actionDeadlineAt: "2026-04-27T00:01:00Z",
          self: {
            playerId: "pl_guest",
            hp: 75,
            mana: 90,
            cooldowns: {
              [defaultSkill.skillId]: 0
            }
          },
          opponent: {
            playerId: "pl_practice",
            hp: 75,
            mana: 80,
            cooldowns: {
              [defaultSkill.skillId]: 1
            }
          },
          battleLog: [
            {
              turnNumber: 1,
              message: defaultSkillLog
            },
            {
              turnNumber: 2,
              message: "pl_guest timed out"
            }
          ],
          winnerPlayerId: "pl_practice",
          loserPlayerId: "pl_guest",
          endedReason: "TIMEOUT"
        }
      }
    });

    expect((await screen.findAllByText("패배")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("턴 타임아웃").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-18").length).toBeGreaterThan(0);
    expect(screen.queryByText("소켓을 다시 연결하는 중입니다. 최신 전투 상태를 복구합니다.")).not.toBeInTheDocument();
  });
});
