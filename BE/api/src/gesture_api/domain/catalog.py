from gesture_api.domain.game import AnimsetDefinition, SkillDefinition, SkillsetDefinition

SKILLSETS = [
    SkillsetDefinition(
        skillset_id="skillset_seal_basic",
        name="주술회전 Phase 1 술식",
        skills=[
            SkillDefinition(
                skill_id="jjk_gojo_red",
                name="赫",
                description="한국어명: 혁. 문서 기준 고죠 사토루 무하한주술의 밀어내는 폭발 피해.",
                gesture_sequence=["index_up"],
                mana_cost=20,
                damage=24,
                cooldown_turn=1,
            ),
            SkillDefinition(
                skill_id="jjk_gojo_hollow_purple",
                name="虚式「茈」",
                description="한국어명: 허식 자. 문서 기준 고죠 사토루 무하한주술의 고비용 직선형 큰 피해.",
                gesture_sequence=["pinch", "blue_orb", "red_orb", "orb_collision"],
                mana_cost=55,
                damage=55,
                cooldown_turn=3,
            ),
            SkillDefinition(
                skill_id="jjk_gojo_infinite_void",
                name="領域展開「無量空処」",
                description="한국어명: 무량공처. 문서 기준 무한 정보 과부하로 상대 입력을 정지시키는 제어형 영역.",
                gesture_sequence=["two_finger_cross", "domain_seal"],
                mana_cost=60,
                damage=40,
                cooldown_turn=4,
            ),
            SkillDefinition(
                skill_id="jjk_sukuna_malevolent_shrine",
                name="領域展開「伏魔御厨子」",
                description="한국어명: 복마어주자. 문서 기준 열린 영역 안에서 범위 절단 피해를 주는 공격형 영역.",
                gesture_sequence=["flat_prayer", "domain_seal"],
                mana_cost=60,
                damage=50,
                cooldown_turn=4,
            ),
            SkillDefinition(
                skill_id="jjk_megumi_chimera_shadow_garden",
                name="領域展開「嵌合暗翳庭」",
                description="한국어명: 감합암예정. 문서 기준 그림자 바다와 식신 소환을 강화하는 영역.",
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
    AnimsetDefinition(animset_id="animset_unity_jjk", name="Unity WebGL 프로토타입"),
]


def find_skillset(skillset_id: str) -> SkillsetDefinition | None:
    return next((skillset for skillset in SKILLSETS if skillset.skillset_id == skillset_id), None)


def find_animset(animset_id: str) -> AnimsetDefinition | None:
    return next((animset for animset in ANIMSETS if animset.animset_id == animset_id), None)
