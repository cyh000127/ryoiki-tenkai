# v6 에픽

v6의 현재 제품 목표는 전투 완성이 아니라 `연습장에서 혼자 술식을 실제로 써보는 경험`을 완성하는 것이다. 사용자는 연습 화면에서 스킬을 고르고, 손동작을 인식시키고, Unity 기반 스킬 이펙트를 즉시 확인할 수 있어야 한다.

전투, 매칭 중 스킬 연출, 결과 replay는 후속 구현계획으로 둔다. 지금은 연습 UX와 Unity 스킬 이펙트 품질이 우선이다.

## V6-E1: Unity Bridge Foundation

- 목표: React 화면과 Unity WebGL 런타임 사이에 얇고 교체 가능한 renderer 경계를 만든다.
- 범위: renderer port, mount/unmount lifecycle, animset registry, JS bridge event contract.
- 제외: Unity가 직접 WebSocket에 연결하거나 전투 규칙을 판정하는 구조.
- 수용 신호:
  - Unity가 없어도 연습 화면은 HTML fallback으로 계속 동작한다.
  - 특정 `animsetId`가 Unity renderer를 선택하면 practice surface에 Unity가 올라온다.

## V6-E2: Skill Presentation Model And Authoring Workflow

- 목표: `skillId -> animsetId -> clip/vfx/camera` 매핑 구조를 고정해 새 스킬 추가 절차를 예측 가능하게 만든다.
- 범위: presentation manifest schema, hero skill starter set, 신규 스킬 onboarding checklist, preview asset policy.
- 제외: 모든 스킬의 풀 3D 제작, GIF 중심 런타임.
- 수용 신호:
  - 새 스킬을 넣을 때 수정해야 하는 파일과 책임 주체가 문서로 고정된다.
  - 연습장에서 Unity 이펙트가 있는 스킬과 fallback 스킬이 명확히 구분된다.

## V6-E3: Practice Renderer Integration

- 목표: 연습 화면에서 손동작 완료 시 Unity 스킬 이펙트가 눈에 띄게 발동되고, 사용자가 반복해서 확인할 수 있게 만든다.
- 범위: practice renderer surface, skill selection projection, step/progress/status projection, practice skill effect trigger, practice fallback preview, overlay UX polish.
- 제외: Unity가 카메라를 직접 읽어 연습 완료를 판정하는 구조.
- 수용 신호:
  - 연습 화면에서 현재 선택한 술식과 단계 상태가 Unity 연출에 반영된다.
  - 손동작 sequence가 완료되면 선택한 스킬의 이펙트가 자연스럽게 발동된다.
  - 같은 스킬을 여러 번 반복 연습할 수 있다.
  - Unity가 실패해도 연습 진행률과 완료 CTA는 계속 동작한다.

## V6-E4: Future Battle Renderer Plan

- 목표: 연습장 스킬 이펙트가 안정화된 뒤, 서버 authoritative battle state를 Unity로 투영해 전투 연출을 강화한다.
- 범위: battle snapshot projection, accepted/rejected action timeline, result/reconnect replay, active battle fallback.
- 현재 상태: 후속 구현계획. v6 현재 구현 순서에서는 착수하지 않는다.
- 제외: Unity가 데미지, 쿨다운, 턴 소유권을 계산하는 구조.
- 수용 신호:
  - 연습장 스킬 이펙트가 먼저 실제 Unity build 또는 충분한 mock 품질로 검증된다.
  - battle started/updated/ended 이벤트가 Unity 연출과 기존 UI 상태를 함께 갱신한다.
  - reconnect 후 최신 snapshot 기준으로 Unity 장면을 복구할 수 있다.

## V6-E5: Safety, Performance, And Rollout

- 목표: 연습장 Unity 이펙트가 제품 신뢰성을 해치지 않도록 fallback, 버전 관리, 성능 기준을 먼저 고정한다.
- 범위: Unity unavailable fallback, asset/version mismatch policy, practice smoke checklist, rollout guardrail.
- 제외: 네이티브 Unity 클라이언트 전환, Unity-owned game client 재설계.
- 수용 신호:
  - Unity 빌드 로드 실패가 연습 진행을 막지 않는다.
  - smoke checklist만으로 practice/fallback 핵심 흐름을 검증할 수 있다.
