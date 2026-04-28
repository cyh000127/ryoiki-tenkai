# 캐릭터, 스킬, STT 후보 카탈로그

## 목적

이 문서는 `C:/Users/SSAFY/Desktop/1.md` 참고자료를 확인한 뒤, 우리 프로젝트에서 확장 후보로 사용할 수 있는 오리지널 캐릭터와 스킬 후보를 정리한 문서입니다.

Phase 1은 주술회전 캐릭터와 술식명으로 먼저 시작합니다. 해당 Phase 1 카탈로그는 `docs/product/jujutsu-character-skill-stt-catalog.ko.md`에 저장합니다. 이 문서는 이후 오리지널 캐릭터로 확장하거나 IP 의존도를 낮출 때 사용할 대체안입니다.

## 설계 원칙

- STT는 발음/억양 점수화가 아니라 명령어 인식 trigger로만 사용합니다.
- STT 성공 후 손동작 입력을 활성화합니다.
- 손동작 sequence가 완성되면 서버가 승인한 skill action 후보만 제출합니다.
- 스킬명, 캐릭터명, 시각 자산은 오리지널 명칭을 사용합니다.
- 내부 손모양 세부 정의는 추후 구현 계획으로 분리합니다.

## 전투 역할

| 역할 | 목적 | 권장 전투 성격 |
| --- | --- | --- |
| 공간 제어형 | 상대의 행동 범위와 턴 템포를 제한 | shield, slow, bind |
| 소환 연계형 | 보조체 또는 분신을 통해 연속 압박 | summon, multi-hit |
| 절단 공격형 | 단일 대상에게 높은 피해를 집중 | burst damage |
| 변형 방해형 | 상대 입력 안정성을 흔들거나 다음 행동을 제한 | debuff, interrupt |
| 언령 제어형 | STT 명령 자체를 콘셉트로 삼는 제어형 | stun, silence |
| 혈류/자원형 | 체력 또는 마나를 비용으로 쓰는 고위험 스킬 | self-cost, drain |

## 캐릭터 후보

| 캐릭터 ID | 이름 | 콘셉트 | 기본 STT 트리거 | 핵심 플레이 |
| --- | --- | --- | --- | --- |
| `CHR_ASTER` | 아스터 | 공간을 접어 방어와 반격을 만드는 수비형 술자 | `結界起動` | 방어막을 만들고 다음 턴 피해를 반사 |
| `CHR_KAGE` | 카게 | 그림자 표식을 남겨 연속 공격을 준비하는 전술형 술자 | `影を開け` | 표식 누적 후 폭발 피해 |
| `CHR_REN` | 렌 | 붉은 기류를 압축해 빠른 단일 공격을 넣는 공격형 술자 | `赤脈起動` | 자원을 소모해 높은 피해 |
| `CHR_SHION` | 시온 | 음성 명령으로 상대 행동을 묶는 제어형 술자 | `言霊起動` | 짧은 제어와 interrupt |
| `CHR_MIKA` | 미카 | 부적을 설치하고 조건부 회복/피해를 발동하는 지원형 술자 | `符陣展開` | 지속 효과와 회복 |
| `CHR_TODO` | 토도 | 위치를 바꾸며 근접 압박을 만드는 교란형 술자 | `転位開始` | 회피, 자리 교환, combo opening |

## 스킬 후보

| 스킬 ID | 캐릭터 | 스킬명 | STT 트리거 후보 | 효과 초안 | 구현 상태 |
| --- | --- | --- | --- | --- | --- |
| `SKL_ASTER_01` | 아스터 | 무한 장벽 | `結界起動` / `壁を張れ` | 1턴 동안 받는 피해 감소 | planned |
| `SKL_ASTER_02` | 아스터 | 반사광 | `反射開始` | 직전 피해 일부를 상대에게 반환 | planned |
| `SKL_ASTER_03` | 아스터 | 공간 봉합 | `空間を閉じろ` | 상대 다음 입력 허용 시간을 단축 | planned |
| `SKL_KAGE_01` | 카게 | 그림자 표식 | `影を刻め` | 상대에게 shadow mark 1개 부여 | planned |
| `SKL_KAGE_02` | 카게 | 검은 발톱 | `黒爪` | mark가 있으면 추가 피해 | planned |
| `SKL_KAGE_03` | 카게 | 그림자 늪 | `影沼` | 상대 행동 준비 상태를 1단계 늦춤 | planned |
| `SKL_REN_01` | 렌 | 적맥탄 | `赤脈起動` | 마나를 추가 소모해 단일 피해 | planned |
| `SKL_REN_02` | 렌 | 혈류 가속 | `加速しろ` | 다음 손동작 판정 허용 시간을 늘림 | planned |
| `SKL_REN_03` | 렌 | 역류 | `逆流` | 자기 체력을 일부 소모하고 큰 피해 | planned |
| `SKL_SHION_01` | 시온 | 정지 명령 | `止まれ` | 상대 다음 제출을 짧게 지연 | planned |
| `SKL_SHION_02` | 시온 | 파열음 | `弾けろ` | 낮은 피해와 interrupt | planned |
| `SKL_SHION_03` | 시온 | 침묵권 | `沈黙` | 상대의 STT trigger 재시도를 1회 제한 | planned |
| `SKL_MIKA_01` | 미카 | 회복 부적 | `癒やせ` | 자기 체력 소량 회복 | planned |
| `SKL_MIKA_02` | 미카 | 봉쇄 부적 | `封じろ` | 상대 cooldown 1턴 증가 후보 | planned |
| `SKL_MIKA_03` | 미카 | 연쇄 부적 | `符を繋げ` | 다음 스킬 피해 또는 회복 증폭 | planned |
| `SKL_TODO_01` | 토도 | 전위 | `転位開始` | 상대와 자신의 우선권 상태를 교환 | planned |
| `SKL_TODO_02` | 토도 | 충격 박자 | `拍子を打て` | 손동작 성공 시 추가 피해 | planned |
| `SKL_TODO_03` | 토도 | 빈 박자 | `間を外せ` | 상대의 다음 combo 보너스 제거 | planned |

## 영역형 궁극기 후보

| 궁극기 ID | 캐릭터 | 명칭 | STT 트리거 후보 | 효과 초안 | 구현 상태 |
| --- | --- | --- | --- | --- | --- |
| `ULT_ASTER_01` | 아스터 | 접힌 하늘의 결계 | `結界展開、折空` | 2턴 동안 피해 감소와 반격 강화 | planned |
| `ULT_KAGE_01` | 카게 | 그림자 정원 | `結界展開、影庭` | 모든 mark를 폭발시키고 추가 mark 부여 | planned |
| `ULT_REN_01` | 렌 | 붉은 궤도 | `結界展開、赤軌` | 큰 단일 피해, 자기 체력 비용 | planned |
| `ULT_SHION_01` | 시온 | 무음 법정 | `結界展開、無音` | 상대 입력 제출을 1회 강하게 제한 | planned |
| `ULT_MIKA_01` | 미카 | 부적 회랑 | `結界展開、符廊` | 회복과 방어막을 동시에 부여 | planned |
| `ULT_TODO_01` | 토도 | 뒤집힌 무대 | `結界展開、転舞` | 우선권 교란과 추가 행동 기회 | planned |

## STT 매칭 정책

- 일본어 trigger phrase는 `ja-JP` speech recognition으로 transcript를 받습니다.
- 매칭은 정확한 발음 점수가 아니라 normalized keyword 포함 여부로 판단합니다.
- 같은 캐릭터의 여러 스킬이 같은 trigger를 공유하지 않게 합니다.
- 짧은 trigger는 오탐 가능성이 높으므로 궁극기에는 2개 이상의 키워드 조합을 권장합니다.
- STT 실패 시 손동작 입력을 시작하지 않습니다.

## 손모양 구현 계획

손모양 내부 정의는 아직 구현하지 않습니다. 추후 아래 순서로 진행합니다.

1. 캐릭터별 스킬 3개와 궁극기 1개를 먼저 승인합니다.
2. 각 스킬에 필요한 gesture token 수를 정합니다.
3. 기존 `gestureSequence` fixture에 들어갈 중립 token 이름을 확정합니다.
4. 손모양별 인식 안정성 기준을 정합니다.
5. frontend live recognizer에서 token 후보를 관찰합니다.
6. backend skill catalog와 contract에 approved sequence를 반영합니다.
7. loadout UI에서 approved skill metadata만 렌더링합니다.

## 다음 결정 필요 항목

- 실제 MVP 캐릭터 수: 2명, 3명, 6명 중 선택.
- 캐릭터별 스킬 수: 일반 2개 + 궁극기 1개 또는 일반 3개 + 궁극기 1개.
- STT trigger를 일본어만 허용할지, 한국어 fallback을 둘지 결정.
- 스킬 효과 수치: damage, mana cost, cooldown, duration.
- 손모양 token source 승인.
