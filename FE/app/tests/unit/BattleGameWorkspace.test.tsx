import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppProviders } from "../../src/app/AppProviders";
import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET } from "../../src/entities/game/model";
import { BattleGameWorkspace } from "../../src/widgets/battle-game/BattleGameWorkspace";
import type { BattleSocketEvent } from "../../src/platform/api/battleSocket";

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
      socketCloseHandler = onClose;
      socketEventHandler = onEvent;
      return {
        close: () => {
          socketCloseHandler?.();
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores a saved player and blocks matchmaking until the loadout is saved", async () => {
    const user = userEvent.setup();
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

  it("creates a guest, saves the loadout, and then enters battle from socket events", async () => {
    const user = userEvent.setup();
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
          winnerPlayerId: null
        }
      }
    });

    expect(await screen.findByText("내 턴")).toBeInTheDocument();
    expect(screen.getAllByText("HP")).toHaveLength(2);
  });
});
