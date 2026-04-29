import { describe, expect, it } from "vitest";

import {
  listSkillEffectProfiles,
  resolveSkillEffectProfile
} from "../../src/features/skill-effects/model/skillEffectManifest";
import { listSkillPresentationEntries } from "../../src/features/skill-presentation/model/skillPresentationManifest";

describe("skillEffectManifest", () => {
  it("keeps Gojo hero effects Unity-ready with sustained completion replay", () => {
    const red = resolveSkillEffectProfile("jjk_gojo_red");
    const purple = resolveSkillEffectProfile("jjk_gojo_hollow_purple");
    const domain = resolveSkillEffectProfile("jjk_gojo_infinite_void");

    expect(red).toMatchObject({
      effectId: "red_burst",
      replayPolicy: "sustain-after-complete",
      supportsUnity: true,
      tone: "red"
    });
    expect(purple).toMatchObject({
      effectId: "purple_impact",
      replayPolicy: "sustain-after-complete",
      supportsUnity: true,
      tone: "purple"
    });
    expect(domain).toMatchObject({
      effectId: "void_crush",
      replayPolicy: "sustain-after-complete",
      supportsUnity: true,
      tone: "domain"
    });
  });

  it("keeps fallback skills explicit and non-Unity until assets are authored", () => {
    const shrine = resolveSkillEffectProfile("jjk_sukuna_malevolent_shrine");
    const shadow = resolveSkillEffectProfile("jjk_megumi_chimera_shadow_garden");

    expect(shrine.supportsUnity).toBe(false);
    expect(shrine.replayPolicy).toBe("fallback-static");
    expect(shadow.supportsUnity).toBe(false);
    expect(shadow.replayPolicy).toBe("fallback-static");
  });

  it("keeps presentation impactVfxId aligned with the effect manifest", () => {
    for (const entry of listSkillPresentationEntries("animset_unity_jjk")) {
      const effect = resolveSkillEffectProfile(entry.skillId);

      expect(entry.impactVfxId).toBe(effect.effectId);
    }
  });

  it("returns a neutral profile for unknown skills", () => {
    const unknown = resolveSkillEffectProfile("custom_pending_skill");

    expect(unknown).toMatchObject({
      effectId: "generic_skill_pulse",
      skillId: "custom_pending_skill",
      supportsUnity: false,
      tone: "neutral"
    });
    expect(listSkillEffectProfiles()).toHaveLength(5);
  });
});
