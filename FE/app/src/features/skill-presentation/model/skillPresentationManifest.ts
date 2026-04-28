export type SkillPresentationEntry = {
  animsetId: string;
  cameraPresetId?: string;
  clipId?: string;
  fallbackMode: "html-only" | "poster" | "video" | "unity";
  impactVfxId?: string;
  skillId: string;
  tier: "hero" | "standard" | "experimental";
  timelineId: string;
};

type SkillPresentationSeed = Omit<SkillPresentationEntry, "animsetId">;

const skillPresentationSeeds: Record<string, SkillPresentationSeed> = {
  jjk_gojo_hollow_purple: {
    clipId: "gojo_hollow_purple_cast",
    fallbackMode: "unity",
    cameraPresetId: "beam_finisher",
    impactVfxId: "purple_impact",
    skillId: "jjk_gojo_hollow_purple",
    tier: "hero",
    timelineId: "timeline.gojo.hollow_purple"
  },
  jjk_gojo_infinite_void: {
    clipId: "gojo_infinite_void_domain",
    fallbackMode: "unity",
    cameraPresetId: "domain_expansion",
    impactVfxId: "void_crush",
    skillId: "jjk_gojo_infinite_void",
    tier: "hero",
    timelineId: "timeline.gojo.infinite_void"
  },
  jjk_gojo_red: {
    clipId: "gojo_red_cast",
    fallbackMode: "unity",
    cameraPresetId: "projectile_closeup",
    impactVfxId: "red_burst",
    skillId: "jjk_gojo_red",
    tier: "hero",
    timelineId: "timeline.gojo.red"
  },
  jjk_megumi_chimera_shadow_garden: {
    fallbackMode: "html-only",
    cameraPresetId: "shadow_low_angle",
    impactVfxId: "shadow_surge",
    skillId: "jjk_megumi_chimera_shadow_garden",
    tier: "standard",
    timelineId: "timeline.megumi.chimera_shadow_garden"
  },
  jjk_sukuna_malevolent_shrine: {
    fallbackMode: "html-only",
    cameraPresetId: "shrine_panorama",
    impactVfxId: "cleave_barrage",
    skillId: "jjk_sukuna_malevolent_shrine",
    tier: "standard",
    timelineId: "timeline.sukuna.malevolent_shrine"
  }
};

const unityPresentationManifest: SkillPresentationEntry[] = Object.values(skillPresentationSeeds).map(
  (entry) => ({
    ...entry,
    animsetId: "animset_unity_jjk"
  })
);

export function listSkillPresentationEntries(animsetId?: string): SkillPresentationEntry[] {
  if (!animsetId) {
    return [...unityPresentationManifest];
  }

  return unityPresentationManifest
    .filter((entry) => entry.animsetId === animsetId)
    .map((entry) => ({ ...entry }));
}

export function resolveSkillPresentationEntry(
  skillId: string,
  animsetId: string
): SkillPresentationEntry {
  const exactMatch = unityPresentationManifest.find(
    (entry) => entry.skillId === skillId && entry.animsetId === animsetId
  );
  if (exactMatch) {
    return { ...exactMatch };
  }

  const seed = skillPresentationSeeds[skillId];
  if (seed) {
    return {
      ...seed,
      animsetId,
      clipId: undefined,
      fallbackMode: "html-only"
    };
  }

  return {
    animsetId,
    fallbackMode: "html-only",
    skillId,
    tier: "experimental",
    timelineId: `timeline.${skillId}.fallback`
  };
}
