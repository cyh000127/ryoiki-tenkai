# v4-5 jutsu Skill Catalog Intake

## Purpose

Review `C:/Users/SSAFY/Documents/jutsu` and add the first selectable technique catalog for battle loadouts.

## Sources Reviewed

- `SAT0RU`: confirmed index up, pinch, cross, and prayer gesture concepts for the technique visualizer.
- `Hollow-Purple-AR-Real-Time-Gesture-Mapping-Hand-Tracking-3D-Drawing`: confirmed the blue/red orb collision concept for Hollow Purple.
- `Jujutsu-Kaisen-Domain-Expansion`: confirmed Infinite Void, Malevolent Shrine, and Chimera Shadow Garden domain candidates and the training data shape.

## Implementation

- Added normalized gesture tokens to the shared catalog fixture.
- Added five Phase 1 Jujutsu techniques to the backend skill catalog.
- Aligned the frontend fallback/default skillset with the shared fixture.
- Kept the existing `skillset_seal_basic` ID for player and loadout compatibility.

## Added Techniques

| Skill ID | Name | Gesture sequence | Mana | Damage | Cooldown |
| --- | --- | --- | --- | --- | --- |
| `jjk_gojo_red` | 赫 | `index_up` | 20 | 24 | 1 |
| `jjk_gojo_hollow_purple` | 虚式「茈」 | `pinch`, `blue_orb`, `red_orb`, `orb_collision` | 55 | 55 | 3 |
| `jjk_gojo_infinite_void` | 領域展開「無量空処」 | `two_finger_cross`, `domain_seal` | 60 | 40 | 4 |
| `jjk_sukuna_malevolent_shrine` | 領域展開「伏魔御厨子」 | `flat_prayer`, `domain_seal` | 60 | 50 | 4 |
| `jjk_megumi_chimera_shadow_garden` | 領域展開「嵌合暗翳庭」 | `shadow_seal`, `domain_seal` | 55 | 42 | 4 |

## Out of Scope

- External demo source code, images, and model files were not copied.
- Actual landmark-based hand-shape classification is not implemented yet.
- Visual effects and sound presentation remain separate implementation units.

## Verification

- The backend contract fixture must match `gesture_api.domain.catalog.SKILLSETS`.
- The frontend `DEFAULT_SKILLSET` must match the first skillset in the shared fixture.
- Every added gesture sequence token must exist in `normalizedGestureTokens`.
