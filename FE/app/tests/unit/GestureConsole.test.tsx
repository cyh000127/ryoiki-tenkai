import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GestureConsole } from "../../src/widgets/gesture-console/GestureConsole";

describe("GestureConsole", () => {
  it("renders command state and accepts a simulated gesture", async () => {
    const user = userEvent.setup();

    render(<GestureConsole />);

    await user.click(screen.getByRole("button", { name: "Pinch" }));

    expect(screen.getByText("pinch")).toBeInTheDocument();
    expect(screen.getByText("skill.confirm")).toBeInTheDocument();
  });
});
