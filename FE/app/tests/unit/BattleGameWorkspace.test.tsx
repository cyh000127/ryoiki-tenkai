import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppProviders } from "../../src/app/AppProviders";
import { DEFAULT_ANIMSETS, DEFAULT_SKILLSET } from "../../src/entities/game/model";
import { BattleGameWorkspace } from "../../src/widgets/battle-game/BattleGameWorkspace";

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

vi.mock("../../src/platform/api/playerSession", () => ({
  loadStoredPlayerSession: () => storedSession,
  savePlayerSession: (session: MockSession) => {
    storedSession = session;
  },
  clearPlayerSession: () => {
    storedSession = null;
  }
}));

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

    throw new Error(`Unhandled fetch request: ${pathname}`);
  });
}

describe("BattleGameWorkspace", () => {
  beforeEach(() => {
    storedSession = null;
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

  it("creates a guest, saves the loadout, and then enters matchmaking", async () => {
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
  });
});
