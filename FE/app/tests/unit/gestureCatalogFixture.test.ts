import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_SKILLSET } from "../../src/entities/game/model";

type GestureCatalogContract = {
  tokenSetId: string;
  normalizedGestureTokens: Array<{
    token: string;
    label: string;
    category: "pose" | "timing";
  }>;
  skillsets: Array<{
    skillsetId: string;
    name: string;
    skills: Array<{
      skillId: string;
      name: string;
      gestureSequence: string[];
      manaCost: number;
      damage: number;
      cooldownTurn: number;
    }>;
  }>;
};

function loadGestureCatalogContract(): GestureCatalogContract {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "../../BE/api/contracts/catalog/mvp-gesture-catalog.json"),
      "utf-8"
    )
  ) as GestureCatalogContract;
}

describe("mvp gesture catalog contract", () => {
  it("keeps the frontend default skillset aligned with the shared fixture", () => {
    const contract = loadGestureCatalogContract();
    const contractSkillset = contract.skillsets[0];
    const allowedTokens = new Set(
      contract.normalizedGestureTokens.map((tokenDefinition) => tokenDefinition.token)
    );

    expect(contract.tokenSetId).toBe("mvp_gesture_tokens_v1");
    expect(contractSkillset).toEqual(DEFAULT_SKILLSET);
    expect(DEFAULT_SKILLSET.skills.length).toBeGreaterThanOrEqual(8);
    expect(
      DEFAULT_SKILLSET.skills.every((skill) =>
        skill.gestureSequence.every((token) => allowedTokens.has(token))
      )
    ).toBe(true);
  });
});
