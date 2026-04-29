# v6 TODO

기준 시점: `2026-04-29`

이 문서는 현재 `v6` Unity renderer 통합에서 남아 있는 작업을 구현 순서 중심으로 정리한 TODO입니다.

## 현재 제품 우선순위

1. 전투는 후속 구현계획이다.
2. 현재 중요한 것은 연습장에서 혼자 스킬을 사용할 수 있는 UX다.
3. 손동작 인식 후 Unity 스킬 이펙트가 확실히 보여야 한다.
4. 이펙트가 부족하거나 안 보이면 먼저 practice effect 품질을 고친다.

## 현재 반영된 범위

- renderer port / registry / HTML fallback / Unity WebGL adapter
- skill presentation manifest seed
- practice camera overlay renderer
- practice recognizer 자동 시작
- Gojo 3종 mock WebGL placeholder preview
- Unity load 실패와 version mismatch fallback guard
- `practice.completed` 기반 발동 loop와 완료 sustain overlay
- fallback 스킬의 연습 완료 activation 검증

즉 지금은 `연습 화면에서 Unity 통합 감`과 `손동작 완료 후 발동 이펙트`까지는 확인 가능하다. 다만 실제 Unity Editor build 산출물은 아직 없으므로, 현재 이펙트는 bridge-compatible placeholder 상태다.

## 우선순위 1. Practice Skill Effect Activation Loop

- 목표: 사용자가 연습장에서 스킬을 선택하고 손동작을 성공시키면, 선택한 스킬의 이펙트가 자연스럽게 발동되도록 합니다.
- 이유: 현재 핵심 제품 경험은 전투가 아니라 혼자 스킬을 써보는 것입니다.
- 완료 기준:
  - `practice.skill_selected`가 현재 선택 술식과 presentation을 Unity에 보냅니다.
  - `practice.progress_updated`가 현재 단계와 인식 상태를 Unity에 보냅니다.
  - `practice.completed`가 이펙트 발동 trigger로 쓰입니다.
  - 발동 상태가 너무 빨리 사라지지 않습니다.
  - `연습 초기화` 또는 스킬 재선택으로 반복 연습할 수 있습니다.
- 구현 상태: 반영 완료. 상세 기록은 `docs/implementation-artifacts/v6-2-practice-effect-activation.ko.md`를 기준으로 본다.

## 우선순위 2. Gojo 3종 이펙트 품질 개선

- 목표: Gojo 3종이 서로 구분되는 스킬 이펙트로 보이게 만듭니다.
- 대상:
  - `jjk_gojo_red`
  - `jjk_gojo_hollow_purple`
  - `jjk_gojo_infinite_void`
- 완료 기준:
  - `jjk_gojo_red`: 붉은 차징, 발사, 충돌감이 보입니다.
  - `jjk_gojo_hollow_purple`: 적/청 결합과 보라색 관통 연출이 보입니다.
  - `jjk_gojo_infinite_void`: 영역 전개 느낌의 화면 장악 연출이 보입니다.
  - 각 이펙트가 손 mesh와 상태 HUD를 완전히 가리지 않습니다.
- 구현 상태: mock WebGL placeholder 기준 1차 품질 개선 완료.

## 우선순위 3. 실제 Unity WebGL build로 교체

- 목표: `mock.loader.js` 기반 placeholder를 실제 Unity Editor build 산출물로 대체합니다.
- 이유: 현재 preview는 브리지와 레이아웃 검증용으로는 충분하지만, 실제 Unity pipeline 검증은 아직 아닙니다.
- 현재 상태: 이 작업은 Unity Editor와 실제 build asset이 필요해 현재 저장소 코드만으로 완료할 수 없습니다.
- 완료 기준:
  - Unity Editor build가 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/` 경로에서 로드됩니다.
  - practice scene이 mock runtime 없이 mount/unmount 됩니다.
  - local browser에서 practice smoke 확인을 남깁니다.

## 우선순위 4. Practice Overlay UX Polish

- 목표: camera 위에 renderer가 올라가도 recognizer mesh, 상태 badge, helper text가 서로 겹치지 않게 다듬습니다.
- 이유: 사용자는 손이 인식되는지와 스킬이 발동됐는지를 동시에 알아야 합니다.
- 완료 기준:
  - desktop/mobile에서 overlay 정보 우선순위가 정리됩니다.
  - effect 강도와 mesh 가시성이 조정됩니다.
  - 필요하면 `renderer visibility toggle`을 추가합니다.

## 우선순위 5. Hero 외 스킬 Fallback 전략

- 목표: Sukuna, Megumi 계열을 빈 Unity 화면처럼 보이지 않게 유지합니다.
- 현재 정책: `jjk_sukuna_malevolent_shrine`, `jjk_megumi_chimera_shadow_garden`은 실제 Unity asset이 붙기 전까지 `html-only` fallback으로 고정합니다.
- 완료 기준:
  - fallback 스킬도 연습 진행 자체는 가능합니다.
  - 사용자는 해당 스킬이 아직 Unity 이펙트 대상이 아니라는 점을 짧게 이해할 수 있습니다.
- 구현 상태: 정책 유지. fallback renderer의 완료 상태 테스트를 추가했다.

## 우선순위 6. Practice Smoke와 문서 갱신

- 목표: 실제 Unity build가 붙는 시점에 README, Unity scaffold 문서, smoke checklist를 다시 맞춥니다.
- 완료 기준:
  - 로컬 실행 순서 갱신
  - Unity build 교체 절차 갱신
  - practice smoke checklist 갱신
  - no-Unity fallback, version mismatch, missing asset smoke 갱신

## Future. Battle/Result Unity Integration

전투는 후속 구현계획입니다. 아래 항목은 practice skill effect가 안정화된 뒤 진행합니다.

- battle surface Unity renderer 탑재
- authoritative battle snapshot projection
- accepted/rejected action timeline
- reconnect snapshot 복구
- ended result replay

착수 조건:

- 연습장에서 최소 3개 hero skill 이펙트가 충분히 구분됩니다.
- 반복 연습 flow가 안정적입니다.
- 전투 UX와 action accepted/rejected 연출 정책이 별도 승인됩니다.
