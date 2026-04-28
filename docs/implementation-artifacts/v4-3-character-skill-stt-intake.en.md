# v4-3 Character, Skill, and STT Intake Record

## Input

- Local reference file: `C:/Users/SSAFY/Desktop/1.md`
- Request: organize characters and skills for STT and skill creation, while keeping internal hand shapes as a future implementation plan.

## Decision

The reference file contains unique Jujutsu Kaisen characters, technique names, and activation phrases. The user approved starting Phase 1 with Jujutsu Kaisen, so those names are now stored in a separate catalog. Original expansion candidates are kept separately for later use.

## Outputs

- Jujutsu Korean catalog: `docs/product/jujutsu-character-skill-stt-catalog.ko.md`
- Jujutsu English catalog: `docs/product/jujutsu-character-skill-stt-catalog.en.md`
- Original expansion Korean catalog: `docs/product/character-skill-stt-catalog.ko.md`
- Original expansion English catalog: `docs/product/character-skill-stt-catalog.en.md`

## Covered Scope

- Jujutsu character and technique candidates
- Jujutsu normal skill candidates
- Jujutsu domain expansion candidates
- Recommended MVP start set
- Original expansion candidates
- STT matching policy
- Hand-shape implementation plan
- Next decisions

## Excluded Scope

- Implementing internal hand shapes
- Finalizing skill numbers
- Changing backend fixtures or API contracts

## Next Steps

1. Limit MVP character count to 2 or 3.
2. Decide normal skill count and ultimate inclusion per character.
3. Approve STT trigger candidates.
4. When a hand-motion token source is ready, connect gesture sequences and backend skill catalog.
