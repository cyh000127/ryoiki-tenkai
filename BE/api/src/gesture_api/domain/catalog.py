from gesture_api.domain.game import AnimsetDefinition, SkillDefinition, SkillsetDefinition

SKILLSETS = [
    SkillsetDefinition(
        skillset_id="skillset_seal_basic",
        name="기본 인장술",
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
