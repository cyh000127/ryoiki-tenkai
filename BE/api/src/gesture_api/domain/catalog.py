from gesture_api.domain.game import AnimsetDefinition, SkillDefinition, SkillsetDefinition

SKILLSETS = [
    SkillsetDefinition(
        skillset_id="skillset_seal_basic",
        name="주술회전 Phase 1 술식",
        skills=[
            SkillDefinition(
                skill_id="pulse_strike",
                name="파동격",
                gesture_sequence=["seal_1", "seal_3"],
                mana_cost=20,
                damage=25,
                cooldown_turn=1,
            ),
            SkillDefinition(
                skill_id="burst_edge",
                name="쇄도참",
                gesture_sequence=["seal_2", "hold_300", "seal_4"],
                mana_cost=30,
                damage=35,
                cooldown_turn=2,
            ),
            SkillDefinition(
                skill_id="focus_bolt",
                name="집중탄",
                gesture_sequence=["open_palm", "seal_5"],
                mana_cost=15,
                damage=18,
                cooldown_turn=1,
            ),
            SkillDefinition(
                skill_id="jjk_gojo_red",
                name="赫",
                gesture_sequence=["index_up"],
                mana_cost=20,
                damage=24,
                cooldown_turn=1,
            ),
            SkillDefinition(
                skill_id="jjk_gojo_hollow_purple",
                name="虚式「茈」",
                gesture_sequence=["pinch", "blue_orb", "red_orb", "orb_collision"],
                mana_cost=55,
                damage=55,
                cooldown_turn=3,
            ),
            SkillDefinition(
                skill_id="jjk_gojo_infinite_void",
                name="領域展開「無量空処」",
                gesture_sequence=["two_finger_cross", "domain_seal"],
                mana_cost=60,
                damage=40,
                cooldown_turn=4,
            ),
            SkillDefinition(
                skill_id="jjk_sukuna_malevolent_shrine",
                name="領域展開「伏魔御厨子」",
                gesture_sequence=["flat_prayer", "domain_seal"],
                mana_cost=60,
                damage=50,
                cooldown_turn=4,
            ),
            SkillDefinition(
                skill_id="jjk_megumi_chimera_shadow_garden",
                name="領域展開「嵌合暗翳庭」",
                gesture_sequence=["shadow_seal", "domain_seal"],
                mana_cost=55,
                damage=42,
                cooldown_turn=4,
            ),
        ],
    )
]

ANIMSETS = [
    AnimsetDefinition(animset_id="animset_basic_2d", name="기본 2D 연출"),
    AnimsetDefinition(animset_id="animset_impact_2d", name="타격 강조 연출"),
]


def find_skillset(skillset_id: str) -> SkillsetDefinition | None:
    return next((skillset for skillset in SKILLSETS if skillset.skillset_id == skillset_id), None)


def find_animset(animset_id: str) -> AnimsetDefinition | None:
    return next((animset for animset in ANIMSETS if animset.animset_id == animset_id), None)
