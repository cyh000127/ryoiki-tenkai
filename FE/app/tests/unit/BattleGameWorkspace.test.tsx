import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BattleGameWorkspace } from "../../src/widgets/battle-game/BattleGameWorkspace";

describe("BattleGameWorkspace", () => {
  it("runs the matchmaking and first skill input path", async () => {
    const user = userEvent.setup();

    render(<BattleGameWorkspace />);

    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));
    await user.click(screen.getByRole("button", { name: "match.found" }));
    await user.click(screen.getByRole("button", { name: "seal_1" }));
    await user.click(screen.getByRole("button", { name: "seal_3" }));
    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    expect(screen.getAllByText("서버 확정 대기 중").length).toBeGreaterThan(0);

    expect(await screen.findByText("battle.state_updated")).toBeInTheDocument();
    expect(screen.getByText("상대 턴")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("shows a clear message when the target sequence is incomplete", async () => {
    const user = userEvent.setup();

    render(<BattleGameWorkspace />);

    await user.click(screen.getByRole("button", { name: "랭크 1대1 매칭" }));
    await user.click(screen.getByRole("button", { name: "match.found" }));
    await user.click(screen.getByRole("button", { name: "서버 판정 요청" }));

    expect(screen.getByText("목표 제스처를 모두 입력해야 합니다.")).toBeInTheDocument();
  });
});
