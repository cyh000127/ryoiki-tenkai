import { describe, expect, it } from "vitest";

import { resolveSkillPresentationEntry } from "../../src/features/skill-presentation/model/skillPresentationManifest";

describe("skillPresentationManifest", () => {
  it("keeps hero skills on the Unity timeline path", () => {
    const entry = resolveSkillPresentationEntry("jjk_gojo_red", "animset_unity_jjk");

    expect(entry.fallbackMode).toBe("unity");
    expect(entry.clipId).toBe("gojo_red_cast");
    expect(entry.timelineId).toBe("timeline.gojo.red");
  });

  it("marks non-authored Unity skills as html fallback until assets exist", () => {
    const entry = resolveSkillPresentationEntry(
      "jjk_sukuna_malevolent_shrine",
      "animset_unity_jjk"
    );

    expect(entry.fallbackMode).toBe("html-only");
    expect(entry.clipId).toBeUndefined();
    expect(entry.timelineId).toBe("timeline.sukuna.malevolent_shrine");
  });
});
