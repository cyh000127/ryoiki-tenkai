# 주술회전 기반 캐릭터, 스킬, STT 카탈로그

## 목적

이 문서는 `C:/Users/SSAFY/Desktop/1.md`를 Phase 1 도메인 참고자료로 저장한 결과입니다. 현재 프로젝트는 먼저 주술회전 캐릭터와 술식을 기준으로 STT trigger, 스킬 후보, 추후 손모양 구현 계획을 정리합니다.

## 구현 경계

- STT는 발음/억양 점수화가 아니라 일본어 문구 인식 trigger입니다.
- STT trigger가 인식되면 손동작 입력을 활성화합니다.
- 손동작 sequence가 완성되면 해당 캐릭터의 스킬 후보를 제출합니다.
- 내부 손모양 token, 정확한 손인, landmark 기준은 추후 구현 계획으로 분리합니다.
- 현재 문서는 데이터 정리이며 backend fixture/API contract는 아직 변경하지 않습니다.

## 캐릭터와 생득 술식 후보

| 캐릭터 ID | 캐릭터 | 술식명 | 후리가나 | 한국어 | STT trigger 후보 | 전투 역할 |
| --- | --- | --- | --- | --- | --- | --- |
| `JJK_GOJO` | 고죠 사토루 | 無下限呪術 | むかげんじゅじゅつ | 무하한주술 | `無下限呪術` | 공간 제어형 |
| `JJK_MEGUMI` | 후시구로 메구미 | 十種影法術 | とくさのかげぼうじゅつ | 십종영법술 | `十種影法術` | 소환 연계형 |
| `JJK_SUKUNA` | 료멘 스쿠나 | 伏魔御厨子 | ふくまみづし | 복마어주자 | `伏魔御厨子` | 절단 공격형 |
| `JJK_MAHITO` | 마히토 | 無為転変 | むいてんぺん | 무위전변 | `無為転変` | 변형 방해형 |
| `JJK_GETO` | 게토 스구루 | 呪霊操術 | じゅれいそうじゅつ | 주령조술 | `呪霊操術` | 소환/제어형 |
| `JJK_NOBARA` | 노바라 쿠기사키 | 芻霊呪法 | すうれいじゅほう | 추령주법 | `芻霊呪法` | 원격 표식형 |
| `JJK_CHOSO` | 치소 / 카모 노리토시 | 赤血操術 | せっけつそうじゅつ | 적혈조술 | `赤血操術` | 자원 조작형 |
| `JJK_INUMAKI` | 이누마키 토게 | 呪言 | じゅごん | 주언 | `呪言` | 언령 제어형 |
| `JJK_TODO` | 토도 아오이 | 不義遊戯 | ぶぎゆうぎ | 불의유희 | `不義遊戯` | 위치 교환형 |
| `JJK_HAKARI` | 하카리 킨지 | 座殺博徒 | ざさつばくと | 좌살박도 | `座殺博徒` | 확률/재생형 |
| `JJK_NANAMI` | 나나미 켄토 | 十劃呪法 | とおかくじゅほう | 십획주법 | `十劃呪法` | 약점 타격형 |
| `JJK_YUTA` | 옷코츠 유타 | 模倣 | もほう | 모방 | `模倣` | 복제/연계형 |
| `JJK_URAUME` | 우라우메 | 氷凝呪法 | ひょうぎょうじゅほう | 빙응주법 | `氷凝呪法` | 빙결 제어형 |
| `JJK_NAOYA` | 젠인 나오야 | 投射呪法 | とうしゃじゅほう | 투사주법 | `投射呪法` | 고속 압박형 |

## 일반 스킬 후보

| 스킬 ID | 캐릭터 | 스킬명 | STT trigger 후보 | 효과 초안 | 손동작 구현 상태 |
| --- | --- | --- | --- | --- | --- |
| `JJK_GOJO_BLUE` | 고죠 사토루 | 蒼 | `蒼` / `むかげんじゅじゅつ、あお` | 상대를 끌어당기는 제어 피해 | planned |
| `JJK_GOJO_RED` | 고죠 사토루 | 赫 | `赫` / `むかげんじゅじゅつ、あか` | 밀어내는 폭발 피해 | planned |
| `JJK_GOJO_PURPLE` | 고죠 사토루 | 紫 | `紫` / `むかげんじゅじゅつ、むらさき` | 고비용 직선형 큰 피해 | planned |
| `JJK_MEGUMI_DOG` | 후시구로 메구미 | 玉犬 | `玉犬` | 빠른 단일 공격 소환 | planned |
| `JJK_MEGUMI_NUE` | 후시구로 메구미 | 鵺 | `鵺` | 공중/전격형 압박 | planned |
| `JJK_MEGUMI_RABBIT` | 후시구로 메구미 | 脱兎 | `脱兎` | 회피 또는 교란 효과 | planned |
| `JJK_SUKUNA_CLEAVE` | 료멘 스쿠나 | 解 | `解` | 기본 절단 피해 | planned |
| `JJK_SUKUNA_DISMANTLE` | 료멘 스쿠나 | 捌 | `捌` | 방어를 뚫는 절단 피해 | planned |
| `JJK_SUKUNA_FIRE` | 료멘 스쿠나 | 神の火 | `神の火` | 고비용 화염 피해 | planned |
| `JJK_MAHITO_IDLE` | 마히토 | 無為転変 | `無為転変` | 상대 상태 이상 또는 입력 방해 | planned |
| `JJK_GETO_UZUMAKI` | 게토 스구루 | 極ノ番「うずまき」 | `うずまき` | 축적형 큰 피해 | planned |
| `JJK_NOBARA_RESONANCE` | 노바라 쿠기사키 | 共鳴り | `共鳴り` | 표식 대상 원격 피해 | planned |
| `JJK_NOBARA_HAIRPIN` | 노바라 쿠기사키 | 簪 | `簪` | 지연 폭발 피해 | planned |
| `JJK_INUMAKI_STOP` | 이누마키 토게 | 止まれ | `止まれ` | 상대 행동 지연 | planned |
| `JJK_INUMAKI_BLAST` | 이누마키 토게 | 爆ぜろ | `爆ぜろ` | 즉발 피해 또는 interrupt | planned |
| `JJK_TODO_SWAP` | 토도 아오이 | Boogie Woogie | `不義遊戯` / `ブギウギ` | 위치/우선권 교환 | planned |
| `JJK_NANAMI_RATIO` | 나나미 켄토 | 十劃呪法 | `十劃呪法` | 약점 타격 보너스 | planned |
| `JJK_NANAMI_COLLAPSE` | 나나미 켄토 | 瓦落瓦落 | `瓦落瓦落` | 구조물 붕괴형 피해 | planned |
| `JJK_YUTA_COPY` | 옷코츠 유타 | 模倣 | `模倣` | 상대 또는 아군 스킬 복제 후보 | planned |
| `JJK_URAUME_ICE` | 우라우메 | 氷凝呪法 | `氷凝呪法` | 빙결/감속 효과 | planned |
| `JJK_NAOYA_FRAME` | 젠인 나오야 | 投射呪法 | `投射呪法` | 빠른 연속 행동 후보 | planned |

## 영역전개 후보

| 영역 ID | 캐릭터 | 영역전개명 | 후리가나 | STT trigger 후보 | 효과 초안 | 손동작 구현 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| `JJK_DOMAIN_SUKUNA` | 료멘 스쿠나 | 伏魔御厨子 | ふくまみづし | `領域展開、伏魔御厨子` | 범위 절단 피해 | planned |
| `JJK_DOMAIN_GOJO` | 고죠 사토루 | 無量空処 | むりょうくうしょ | `領域展開、無量空処` | 상대 입력 정지/마비 | planned |
| `JJK_DOMAIN_MAHITO` | 마히토 | 自閉円頓裹 | じへいえんどんか | `領域展開、自閉円頓裹` | 강한 상태 이상 | planned |
| `JJK_DOMAIN_JOGO` | 죠고 | 蓋棺鉄囲山 | がいかんてっちせん | `領域展開、蓋棺鉄囲山` | 화산/화염 지속 피해 | planned |
| `JJK_DOMAIN_DAGON` | 다곤 | 蕩蘊平線 | たううんへいせん | `領域展開、蕩蘊平線` | 식신 대량 공격 | planned |
| `JJK_DOMAIN_MEGUMI` | 후시구로 메구미 | 嵌合暗翳庭 | かんごうあんえいてい | `領域展開、嵌合暗翳庭` | 그림자 소환 강화 | planned |
| `JJK_DOMAIN_HAKARI` | 하카리 킨지 | 座殺博徒 | ざさつばくと | `領域展開、座殺博徒` | 확률 기반 회복/강화 | planned |
| `JJK_DOMAIN_HIGURUMA` | 히구루마 히로미 | 誅伏賜死 | ちゅうぶくしし | `領域展開、誅伏賜死` | 판결 기반 제한 | planned |
| `JJK_DOMAIN_NAOYA` | 젠인 나오야 | 時胞月宮殿 | じほうげっきゅうでん | `領域展開、時胞月宮殿` | 시간 가속/지연 | planned |
| `JJK_DOMAIN_KENJAKU` | 켄자쿠 | 胎蔵遍野 | たいぞうへんや | `領域展開、胎蔵遍野` | 중력/압박 효과 | planned |
| `JJK_DOMAIN_YUTA` | 옷코츠 유타 | 真贋相愛 | しんがんそうあい | `領域展開、真贋相愛` | 복제 연계 강화 | planned |

## STT 우선순위

1. 캐릭터 술식명: `無下限呪術`, `十種影法術`, `呪言`.
2. 일반 스킬명: `蒼`, `赫`, `紫`, `解`, `捌`, `共鳴り`.
3. 영역전개: `領域展開、{영역명}`.
4. 짧은 단어는 오탐 가능성이 있으므로 캐릭터 술식명과 함께 조합합니다.

## 손모양 구현 계획

손모양은 추후 구현합니다.

1. MVP 캐릭터를 먼저 2~3명으로 제한합니다.
2. 캐릭터당 일반 스킬 2개와 영역전개 1개를 선택합니다.
3. 각 스킬의 손동작 token 수를 1~3개로 제한합니다.
4. 실제 손인 자료와 카메라 인식 안정성을 확인합니다.
5. `gestureSequence` fixture에 승인된 token만 추가합니다.
6. backend skill catalog와 frontend loadout metadata를 같은 fixture에서 맞춥니다.

## MVP 추천 시작 세트

| 캐릭터 | 일반 스킬 | 영역전개 | 이유 |
| --- | --- | --- | --- |
| 고죠 사토루 | `蒼`, `赫` | `無量空処` | STT 인식 후보가 명확하고 시각/효과 구분이 쉬움 |
| 후시구로 메구미 | `玉犬`, `鵺` | `嵌合暗翳庭` | 소환형 스킬 구조를 검증하기 좋음 |
| 이누마키 토게 | `止まれ`, `爆ぜろ` | 없음 또는 추후 | STT 콘셉트와 직접적으로 맞음 |

## jutsu 자료 반영 결과

`C:/Users/SSAFY/Documents/jutsu` 자료를 확인해 Phase 1 runtime catalog에는 다음 술식을 먼저 반영합니다.

| 반영 ID | 술식 | 참고 자료 | normalized gesture token | 구현 상태 |
| --- | --- | --- | --- | --- |
| `jjk_gojo_red` | 赫 | `SAT0RU` index finger trigger | `index_up` | catalog 적용 |
| `jjk_gojo_hollow_purple` | 虚式「茈」 | Hollow Purple AR orb collision concept / `SAT0RU` pinch trigger | `pinch`, `blue_orb`, `red_orb`, `orb_collision` | catalog 적용 |
| `jjk_gojo_infinite_void` | 領域展開「無量空処」 | Domain Expansion recognition / SAT0RU cross gesture | `two_finger_cross`, `domain_seal` | catalog 적용 |
| `jjk_sukuna_malevolent_shrine` | 領域展開「伏魔御厨子」 | Domain Expansion recognition / SAT0RU prayer gesture | `flat_prayer`, `domain_seal` | catalog 적용 |
| `jjk_megumi_chimera_shadow_garden` | 領域展開「嵌合暗翳庭」 | Domain Expansion recognition dataset | `shadow_seal`, `domain_seal` | catalog 적용 |

외부 데모의 소스 코드, 이미지, 모델 파일은 프로젝트에 복사하지 않습니다. 현재 반영 범위는 술식명, 전투 수치 초안, normalized gesture token 계약입니다. 실제 landmark 판정과 시각 효과는 별도 구현 단위로 진행합니다.
