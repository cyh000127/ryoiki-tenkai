# v4-5 jutsu 술식 카탈로그 반영 기록

## 목적

`C:/Users/SSAFY/Documents/jutsu`의 참고 자료를 확인해, 전투 로드아웃에서 선택 가능한 1차 술식 카탈로그를 추가한다.

## 참고한 자료

- `SAT0RU`: index up, pinch, cross, prayer gesture와 술식 visualizer 구성을 확인했다.
- `Hollow-Purple-AR-Real-Time-Gesture-Mapping-Hand-Tracking-3D-Drawing`: blue/red orb collision 기반 Hollow Purple 흐름을 확인했다.
- `Jujutsu-Kaisen-Domain-Expansion`: Infinite Void, Malevolent Shrine, Chimera Shadow Garden domain 후보와 학습 데이터 구성을 확인했다.

## 구현 내용

- shared catalog fixture에 normalized gesture token을 추가했다.
- backend skill catalog에 주술회전 Phase 1 술식 5개를 추가했다.
- frontend fallback/default skillset을 shared fixture와 맞췄다.
- 기존 player/loadout 호환성을 위해 `skillset_seal_basic` ID는 유지했다.

## 추가된 술식

| Skill ID | 이름 | Gesture sequence | Mana | Damage | Cooldown |
| --- | --- | --- | --- | --- | --- |
| `jjk_gojo_red` | 赫 | `index_up` | 20 | 24 | 1 |
| `jjk_gojo_hollow_purple` | 虚式「茈」 | `pinch`, `blue_orb`, `red_orb`, `orb_collision` | 55 | 55 | 3 |
| `jjk_gojo_infinite_void` | 領域展開「無量空処」 | `two_finger_cross`, `domain_seal` | 60 | 40 | 4 |
| `jjk_sukuna_malevolent_shrine` | 領域展開「伏魔御厨子」 | `flat_prayer`, `domain_seal` | 60 | 50 | 4 |
| `jjk_megumi_chimera_shadow_garden` | 領域展開「嵌合暗翳庭」 | `shadow_seal`, `domain_seal` | 55 | 42 | 4 |

## 제외 범위

- 외부 데모 소스 코드, 이미지, 모델 파일은 복사하지 않았다.
- 실제 landmark 기반 손모양 분류는 아직 구현하지 않았다.
- 시각 효과와 사운드 연출은 별도 구현 단위로 남긴다.

## 검증

- backend contract fixture와 `gesture_api.domain.catalog.SKILLSETS`가 동일해야 한다.
- frontend `DEFAULT_SKILLSET`이 shared fixture의 첫 skillset과 동일해야 한다.
- 추가된 gesture sequence는 모두 `normalizedGestureTokens`에 포함되어야 한다.
