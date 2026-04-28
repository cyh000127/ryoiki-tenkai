# Jujutsu-Based Character, Skill, and STT Catalog

## Purpose

This document organizes the Phase 1 domain reference as a product catalog. The project starts with Jujutsu Kaisen characters and techniques for STT triggers, skill candidates, and future hand-shape implementation planning.

## Implementation Boundary

- STT is Japanese phrase trigger recognition, not pronunciation or accent scoring.
- A recognized STT trigger activates hand-motion input.
- A completed hand-motion sequence submits the matching character skill candidate.
- Internal hand-motion tokens, exact hand seals, and landmark criteria remain future work.
- This is a data planning document; backend fixtures and API contracts are not changed yet.

## Character and Innate Technique Candidates

| Character ID | Character | Technique | Furigana | Korean | STT Trigger Candidate | Combat Role |
| --- | --- | --- | --- | --- | --- | --- |
| `JJK_GOJO` | Satoru Gojo | 無下限呪術 | むかげんじゅじゅつ | 무하한주술 | `無下限呪術` | Space control |
| `JJK_MEGUMI` | Megumi Fushiguro | 十種影法術 | とくさのかげぼうじゅつ | 십종영법술 | `十種影法術` | Summon chain |
| `JJK_SUKUNA` | Ryomen Sukuna | 伏魔御厨子 | ふくまみづし | 복마어주자 | `伏魔御厨子` | Cutting burst |
| `JJK_MAHITO` | Mahito | 無為転変 | むいてんぺん | 무위전변 | `無為転変` | Mutation disruptor |
| `JJK_GETO` | Suguru Geto | 呪霊操術 | じゅれいそうじゅつ | 주령조술 | `呪霊操術` | Summon/control |
| `JJK_NOBARA` | Nobara Kugisaki | 芻霊呪法 | すうれいじゅほう | 추령주법 | `芻霊呪法` | Remote mark |
| `JJK_CHOSO` | Choso / Noritoshi Kamo | 赤血操術 | せっけつそうじゅつ | 적혈조술 | `赤血操術` | Resource control |
| `JJK_INUMAKI` | Toge Inumaki | 呪言 | じゅごん | 주언 | `呪言` | Voice control |
| `JJK_TODO` | Aoi Todo | 不義遊戯 | ぶぎゆうぎ | 불의유희 | `不義遊戯` | Position swap |
| `JJK_HAKARI` | Kinji Hakari | 座殺博徒 | ざさつばくと | 좌살박도 | `座殺博徒` | Chance/regeneration |
| `JJK_NANAMI` | Kento Nanami | 十劃呪法 | とおかくじゅほう | 십획주법 | `十劃呪法` | Weak-point strike |
| `JJK_YUTA` | Yuta Okkotsu | 模倣 | もほう | 모방 | `模倣` | Copy/chain |
| `JJK_URAUME` | Uraume | 氷凝呪法 | ひょうぎょうじゅほう | 빙응주법 | `氷凝呪法` | Ice control |
| `JJK_NAOYA` | Naoya Zenin | 投射呪法 | とうしゃじゅほう | 투사주법 | `投射呪法` | High-speed pressure |

## Normal Skill Candidates

| Skill ID | Character | Skill | STT Trigger Candidate | Draft Effect | Hand-Motion Status |
| --- | --- | --- | --- | --- | --- |
| `JJK_GOJO_BLUE` | Satoru Gojo | 蒼 | `蒼` / `むかげんじゅじゅつ、あお` | Pulling control damage | planned |
| `JJK_GOJO_RED` | Satoru Gojo | 赫 | `赫` / `むかげんじゅじゅつ、あか` | Repelling burst damage | planned |
| `JJK_GOJO_PURPLE` | Satoru Gojo | 紫 | `紫` / `むかげんじゅじゅつ、むらさき` | High-cost line burst | planned |
| `JJK_MEGUMI_DOG` | Megumi Fushiguro | 玉犬 | `玉犬` | Fast single-target summon | planned |
| `JJK_MEGUMI_NUE` | Megumi Fushiguro | 鵺 | `鵺` | Aerial/lightning pressure | planned |
| `JJK_MEGUMI_RABBIT` | Megumi Fushiguro | 脱兎 | `脱兎` | Evade or disrupt | planned |
| `JJK_SUKUNA_CLEAVE` | Ryomen Sukuna | 解 | `解` | Basic cutting damage | planned |
| `JJK_SUKUNA_DISMANTLE` | Ryomen Sukuna | 捌 | `捌` | Defense-piercing cut | planned |
| `JJK_SUKUNA_FIRE` | Ryomen Sukuna | 神の火 | `神の火` | High-cost fire damage | planned |
| `JJK_MAHITO_IDLE` | Mahito | 無為転変 | `無為転変` | Status or input disruption | planned |
| `JJK_GETO_UZUMAKI` | Suguru Geto | 極ノ番「うずまき」 | `うずまき` | Stored-power burst | planned |
| `JJK_NOBARA_RESONANCE` | Nobara Kugisaki | 共鳴り | `共鳴り` | Remote marked-target damage | planned |
| `JJK_NOBARA_HAIRPIN` | Nobara Kugisaki | 簪 | `簪` | Delayed burst damage | planned |
| `JJK_INUMAKI_STOP` | Toge Inumaki | 止まれ | `止まれ` | Delay opponent action | planned |
| `JJK_INUMAKI_BLAST` | Toge Inumaki | 爆ぜろ | `爆ぜろ` | Instant damage or interrupt | planned |
| `JJK_TODO_SWAP` | Aoi Todo | Boogie Woogie | `不義遊戯` / `ブギウギ` | Position or initiative swap | planned |
| `JJK_NANAMI_RATIO` | Kento Nanami | 十劃呪法 | `十劃呪法` | Weak-point bonus hit | planned |
| `JJK_NANAMI_COLLAPSE` | Kento Nanami | 瓦落瓦落 | `瓦落瓦落` | Collapse-style damage | planned |
| `JJK_YUTA_COPY` | Yuta Okkotsu | 模倣 | `模倣` | Candidate copy action | planned |
| `JJK_URAUME_ICE` | Uraume | 氷凝呪法 | `氷凝呪法` | Freeze or slow | planned |
| `JJK_NAOYA_FRAME` | Naoya Zenin | 投射呪法 | `投射呪法` | Fast chained action candidate | planned |

## Domain Expansion Candidates

| Domain ID | Character | Domain | Furigana | STT Trigger Candidate | Draft Effect | Hand-Motion Status |
| --- | --- | --- | --- | --- | --- | --- |
| `JJK_DOMAIN_SUKUNA` | Ryomen Sukuna | 伏魔御厨子 | ふくまみづし | `領域展開、伏魔御厨子` | Area cutting damage | planned |
| `JJK_DOMAIN_GOJO` | Satoru Gojo | 無量空処 | むりょうくうしょ | `領域展開、無量空処` | Stop or paralyze opponent input | planned |
| `JJK_DOMAIN_MAHITO` | Mahito | 自閉円頓裹 | じへいえんどんか | `領域展開、自閉円頓裹` | Strong status effect | planned |
| `JJK_DOMAIN_JOGO` | Jogo | 蓋棺鉄囲山 | がいかんてっちせん | `領域展開、蓋棺鉄囲山` | Lava/fire damage over time | planned |
| `JJK_DOMAIN_DAGON` | Dagon | 蕩蘊平線 | たううんへいせん | `領域展開、蕩蘊平線` | Mass shikigami attack | planned |
| `JJK_DOMAIN_MEGUMI` | Megumi Fushiguro | 嵌合暗翳庭 | かんごうあんえいてい | `領域展開、嵌合暗翳庭` | Strengthen shadow summons | planned |
| `JJK_DOMAIN_HAKARI` | Kinji Hakari | 座殺博徒 | ざさつばくと | `領域展開、座殺博徒` | Chance-based healing/buff | planned |
| `JJK_DOMAIN_HIGURUMA` | Hiromi Higuruma | 誅伏賜死 | ちゅうぶくしし | `領域展開、誅伏賜死` | Judgment-based restriction | planned |
| `JJK_DOMAIN_NAOYA` | Naoya Zenin | 時胞月宮殿 | じほうげっきゅうでん | `領域展開、時胞月宮殿` | Time acceleration or delay | planned |
| `JJK_DOMAIN_KENJAKU` | Kenjaku | 胎蔵遍野 | たいぞうへんや | `領域展開、胎蔵遍野` | Gravity/pressure effect | planned |
| `JJK_DOMAIN_YUTA` | Yuta Okkotsu | 真贋相愛 | しんがんそうあい | `領域展開、真贋相愛` | Copy-chain enhancement | planned |

## STT Priority

1. Character technique names: `無下限呪術`, `十種影法術`, `呪言`.
2. Normal skill names: `蒼`, `赫`, `紫`, `解`, `捌`, `共鳴り`.
3. Domain expansion: `領域展開、{domain name}`.
4. Very short words have false-positive risk, so pair them with character technique names.

## Hand-Shape Implementation Plan

Hand shapes are future work.

1. Limit MVP to 2 or 3 characters first.
2. Select 2 normal skills and 1 domain expansion per character.
3. Limit each skill to 1 to 3 gesture tokens.
4. Verify real hand-seal references and camera recognition stability.
5. Add only approved tokens to the `gestureSequence` fixture.
6. Keep backend skill catalog and frontend loadout metadata aligned from the same fixture.

## Recommended MVP Start Set

| Character | Normal Skills | Domain Expansion | Reason |
| --- | --- | --- | --- |
| Satoru Gojo | `蒼`, `赫` | `無量空処` | Clear STT candidates and easy visual/effect separation |
| Megumi Fushiguro | `玉犬`, `鵺` | `嵌合暗翳庭` | Good summon-skill validation target |
| Toge Inumaki | `止まれ`, `爆ぜろ` | None or later | Directly matches the STT concept |

## External Reference Intake Result

After reviewing local reference material, the Phase 1 runtime catalog now includes the following techniques first.

| Runtime ID | Technique | Reference source | Normalized gesture token | Status |
| --- | --- | --- | --- | --- |
| `jjk_gojo_red` | Reversal Red | index finger trigger reference | `index_up` | catalog applied |
| `jjk_gojo_hollow_purple` | Hollow Purple | orb collision concept / pinch trigger reference | `pinch`, `blue_orb`, `red_orb`, `orb_collision` | catalog applied |
| `jjk_gojo_infinite_void` | Domain Expansion: Unlimited Void | domain recognition / cross gesture reference | `two_finger_cross`, `domain_seal` | catalog applied |
| `jjk_sukuna_malevolent_shrine` | Domain Expansion: Malevolent Shrine | domain recognition / prayer gesture reference | `flat_prayer`, `domain_seal` | catalog applied |
| `jjk_megumi_chimera_shadow_garden` | Domain Expansion: Chimera Shadow Garden | Domain Expansion recognition dataset | `shadow_seal`, `domain_seal` | catalog applied |

The external demo source code, images, and model files are not copied into this project. The current intake scope is technique names, draft battle numbers, and normalized gesture token contracts. Actual landmark classification and visual effects remain separate implementation units.
