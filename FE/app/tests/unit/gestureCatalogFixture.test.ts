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
      description: string;
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
    expect(DEFAULT_SKILLSET.skills.length).toBe(5);
    expect(DEFAULT_SKILLSET.skills.map((skill) => skill.skillId)).toEqual([
      "jjk_gojo_red",
      "jjk_gojo_hollow_purple",
      "jjk_gojo_infinite_void",
      "jjk_sukuna_malevolent_shrine",
      "jjk_megumi_chimera_shadow_garden"
    ]);
    expect(DEFAULT_SKILLSET.skills.every((skill) => skill.description.includes("한국어명:"))).toBe(
      true
    );
    expect(
      DEFAULT_SKILLSET.skills.every((skill) =>
        skill.gestureSequence.every((token) => allowedTokens.has(token))
      )
    ).toBe(true);
  });
});
