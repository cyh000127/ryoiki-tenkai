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

    expect(screen.getByText("battle.state_updated")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
  });
});
