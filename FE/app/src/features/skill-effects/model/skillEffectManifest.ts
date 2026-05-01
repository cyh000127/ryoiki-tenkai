export type SkillEffectTone = "domain" | "neutral" | "purple" | "red" | "shadow" | "shrine";

export type SkillEffectProfile = {
  activationLabel: string;
  completionLabel: string;
  effectId: string;
  intensity: "hero" | "standard";
  replayPolicy: "fallback-static" | "sustain-after-complete";
  skillId: string;
  supportsUnity: boolean;
  tone: SkillEffectTone;
};

const skillEffectProfiles: Record<string, SkillEffectProfile> = {
  jjk_gojo_hollow_purple: {
    activationLabel: "적/청 결합",
    completionLabel: "허식 발동",
    effectId: "purple_impact",
    intensity: "hero",
    replayPolicy: "sustain-after-complete",
    skillId: "jjk_gojo_hollow_purple",
    supportsUnity: true,
    tone: "purple"
  },
  jjk_gojo_infinite_void: {
    activationLabel: "영역 전개",
    completionLabel: "무량공처 전개",
    effectId: "void_crush",
    intensity: "hero",
    replayPolicy: "sustain-after-complete",
    skillId: "jjk_gojo_infinite_void",
    supportsUnity: true,
    tone: "domain"
  },
  jjk_gojo_red: {
    activationLabel: "붉은 차징",
    completionLabel: "혁 발동",
    effectId: "red_burst",
    intensity: "hero",
    replayPolicy: "sustain-after-complete",
    skillId: "jjk_gojo_red",
    supportsUnity: true,
    tone: "red"
  },
  jjk_megumi_chimera_shadow_garden: {
    activationLabel: "그림자 전개",
    completionLabel: "영역 준비 완료",
    effectId: "shadow_surge",
    intensity: "standard",
    replayPolicy: "fallback-static",
    skillId: "jjk_megumi_chimera_shadow_garden",
    supportsUnity: false,
    tone: "shadow"
  },
  jjk_sukuna_malevolent_shrine: {
    activationLabel: "참격 결계",
    completionLabel: "영역 준비 완료",
    effectId: "cleave_barrage",
    intensity: "standard",
    replayPolicy: "fallback-static",
    skillId: "jjk_sukuna_malevolent_shrine",
    supportsUnity: false,
    tone: "shrine"
  }
};

const fallbackEffectProfile: SkillEffectProfile = {
  activationLabel: "기본 술식",
  completionLabel: "술식 발동",
  effectId: "generic_skill_pulse",
  intensity: "standard",
  replayPolicy: "fallback-static",
  skillId: "unknown",
  supportsUnity: false,
  tone: "neutral"
};

export function listSkillEffectProfiles(): SkillEffectProfile[] {
  return Object.values(skillEffectProfiles).map((profile) => ({ ...profile }));
}

export function resolveSkillEffectProfile(skillId: string): SkillEffectProfile {
  const profile = skillEffectProfiles[skillId];
  if (!profile) {
    return {
      ...fallbackEffectProfile,
      skillId
    };
  }

  return { ...profile };
}
