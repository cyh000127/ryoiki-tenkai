# Character, Skill, and STT Candidate Catalog

## Purpose

This document records original character and skill expansion candidates after reviewing the Phase 1 reference material.

Phase 1 starts with Jujutsu Kaisen characters and technique names. That Phase 1 catalog is stored in `docs/product/jujutsu-character-skill-stt-catalog.en.md`. This document is a fallback or expansion option for later original characters.

## Design Principles

- STT is only a trigger recognition path, not pronunciation or accent scoring.
- Successful STT activates hand-motion input.
- When the hand-motion sequence is complete, only server-approved skill action candidates are submitted.
- Skill names, character names, and visual assets use original project names.
- Internal hand-shape definitions are separated into a future implementation plan.

## Combat Roles

| Role | Purpose | Recommended Combat Style |
| --- | --- | --- |
| Space control | Restrict opponent range and turn tempo | shield, slow, bind |
| Summon chain | Pressure through helpers or shadows | summon, multi-hit |
| Cutting burst | Focus high damage on one target | burst damage |
| Mutation disruptor | Reduce input stability or limit next action | debuff, interrupt |
| Voice control | Use spoken commands as a control fantasy | stun, silence |
| Blood/resource | Spend HP or mana for high-risk skills | self-cost, drain |

## Character Candidates

| Character ID | Name | Concept | Default STT Trigger | Core Play |
| --- | --- | --- | --- | --- |
| `CHR_ASTER` | Aster | Defensive caster who folds space into shields and counters | `結界起動` | Build shield and reflect next-turn damage |
| `CHR_KAGE` | Kage | Tactical caster who prepares attacks through shadow marks | `影を開け` | Stack marks, then detonate |
| `CHR_REN` | Ren | Offensive caster who compresses red flow into fast strikes | `赤脈起動` | Spend resources for high damage |
| `CHR_SHION` | Shion | Control caster who binds actions through voice commands | `言霊起動` | Short control and interrupts |
| `CHR_MIKA` | Mika | Support caster who places charms for healing and conditional damage | `符陣展開` | Persistent effects and recovery |
| `CHR_TODO` | Todo | Disruptor who swaps tempo and creates close-range openings | `転位開始` | Evasion, swapping, combo opening |

## Skill Candidates

| Skill ID | Character | Skill Name | STT Trigger Candidate | Draft Effect | Status |
| --- | --- | --- | --- | --- | --- |
| `SKL_ASTER_01` | Aster | Infinite Ward | `結界起動` / `壁を張れ` | Reduce incoming damage for 1 turn | planned |
| `SKL_ASTER_02` | Aster | Reflected Ray | `反射開始` | Return part of previous damage | planned |
| `SKL_ASTER_03` | Aster | Space Seal | `空間を閉じろ` | Shorten the opponent's next input window | planned |
| `SKL_KAGE_01` | Kage | Shadow Mark | `影を刻め` | Apply 1 shadow mark | planned |
| `SKL_KAGE_02` | Kage | Black Claw | `黒爪` | Bonus damage when a mark exists | planned |
| `SKL_KAGE_03` | Kage | Shadow Mire | `影沼` | Delay opponent readiness by 1 step | planned |
| `SKL_REN_01` | Ren | Red Pulse Shot | `赤脈起動` | Spend extra mana for single-target damage | planned |
| `SKL_REN_02` | Ren | Flow Acceleration | `加速しろ` | Extend the next hand-motion input window | planned |
| `SKL_REN_03` | Ren | Backflow | `逆流` | Spend HP for high damage | planned |
| `SKL_SHION_01` | Shion | Stop Command | `止まれ` | Briefly delay the opponent's next submission | planned |
| `SKL_SHION_02` | Shion | Burst Word | `弾けろ` | Low damage plus interrupt | planned |
| `SKL_SHION_03` | Shion | Silent Seal | `沈黙` | Limit one opponent STT trigger retry | planned |
| `SKL_MIKA_01` | Mika | Healing Charm | `癒やせ` | Heal self for a small amount | planned |
| `SKL_MIKA_02` | Mika | Binding Charm | `封じろ` | Candidate: increase opponent cooldown by 1 turn | planned |
| `SKL_MIKA_03` | Mika | Linked Charm | `符を繋げ` | Boost next damage or healing | planned |
| `SKL_TODO_01` | Todo | Shift | `転位開始` | Swap initiative state candidates | planned |
| `SKL_TODO_02` | Todo | Impact Beat | `拍子を打て` | Bonus damage after hand-motion success | planned |
| `SKL_TODO_03` | Todo | Off Beat | `間を外せ` | Remove opponent's next combo bonus | planned |

## Domain-Style Ultimate Candidates

| Ultimate ID | Character | Name | STT Trigger Candidate | Draft Effect | Status |
| --- | --- | --- | --- | --- | --- |
| `ULT_ASTER_01` | Aster | Folded Sky Ward | `結界展開、折空` | 2-turn damage reduction and stronger counter | planned |
| `ULT_KAGE_01` | Kage | Shadow Garden | `結界展開、影庭` | Detonate all marks and apply more marks | planned |
| `ULT_REN_01` | Ren | Red Orbit | `結界展開、赤軌` | High single-target damage with HP cost | planned |
| `ULT_SHION_01` | Shion | Silent Court | `結界展開、無音` | Strongly limit one opponent input submission | planned |
| `ULT_MIKA_01` | Mika | Charm Corridor | `結界展開、符廊` | Apply both healing and shield | planned |
| `ULT_TODO_01` | Todo | Reversed Stage | `結界展開、転舞` | Disrupt initiative and grant an extra action chance | planned |

## STT Matching Policy

- Japanese trigger phrases use `ja-JP` speech recognition transcripts.
- Matching is normalized keyword containment, not pronunciation scoring.
- Multiple skills for the same character should not share the same trigger.
- Short triggers have higher false-positive risk, so ultimates should use at least two keyword pieces.
- If STT fails, hand-motion input does not start.

## Hand-Shape Implementation Plan

Internal hand-shape definitions are not implemented yet. Implement them later in this order:

1. Approve 3 skills and 1 ultimate per character.
2. Decide the number of gesture tokens per skill.
3. Approve neutral token names for the existing `gestureSequence` fixture.
4. Define recognition stability criteria for each hand shape.
5. Observe token candidates in the frontend live recognizer.
6. Reflect approved sequences in the backend skill catalog and contract.
7. Render only approved skill metadata in the loadout UI.

## Decisions Needed Next

- MVP character count: choose 2, 3, or 6.
- Skills per character: 2 normal + 1 ultimate or 3 normal + 1 ultimate.
- Whether STT triggers are Japanese-only or include Korean fallback.
- Skill numbers: damage, mana cost, cooldown, duration.
- Approved hand-motion token source.
