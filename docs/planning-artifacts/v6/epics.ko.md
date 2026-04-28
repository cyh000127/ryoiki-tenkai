# v6 에픽

v6는 기존 웹 플레이 플로우 위에 Unity를 `연출용 animset renderer`로 얇게 통합하는 단계다. 게임 규칙, 매칭, 전투 판정, 카메라 인식은 현재 React와 FastAPI 구조를 유지하고, Unity는 practice/battle surface에서 시각 연출만 담당한다.

## V6-E1: Unity Bridge Foundation

- 목표: React 화면과 Unity WebGL 런타임 사이에 얇고 교체 가능한 renderer 경계를 만든다.
- 범위: renderer port, mount/unmount lifecycle, animset registry, JS bridge event contract.
- 제외: Unity가 직접 WebSocket에 연결하거나 전투 규칙을 판정하는 구조.
- 수용 신호:
  - Unity가 없어도 기존 2D 플레이 플로우가 계속 동작한다.
  - 특정 `animsetId`가 Unity renderer를 선택하면 practice/battle surface에 Unity가 올라온다.

## V6-E2: Skill Presentation Model And Authoring Workflow

- 목표: `skillId -> animsetId -> clip/vfx/camera` 매핑 구조를 고정해 새 스킬 추가 절차를 예측 가능하게 만든다.
- 범위: presentation manifest schema, hero skill starter set, 신규 스킬 onboarding checklist, preview asset policy.
- 제외: 모든 스킬의 풀 3D 제작, GIF 중심 런타임.
- 수용 신호:
  - 새 스킬을 넣을 때 수정해야 하는 파일과 책임 주체가 문서로 고정된다.
  - presentation asset이 없는 스킬도 fallback으로 표시 가능하다.

## V6-E3: Practice Renderer Integration

- 목표: 연습 화면에 Unity 연출을 얹되, local recognizer와 연습 진행은 기존 프론트 상태가 계속 주도하도록 한다.
- 범위: practice renderer surface, skill selection projection, step/progress/status projection, practice fallback preview.
- 제외: Unity가 카메라를 직접 읽어 연습 완료를 판정하는 구조.
- 수용 신호:
  - 연습 화면에서 현재 선택한 술식과 단계 상태가 Unity 연출에 반영된다.
  - Unity가 실패해도 연습 진행률과 완료 CTA는 계속 동작한다.

## V6-E4: Battle Renderer Integration

- 목표: 서버 authoritative battle state를 Unity로 투영해 전투 연출을 강화한다.
- 범위: battle snapshot projection, accepted/rejected action timeline, result/reconnect replay, active battle fallback.
- 제외: Unity가 데미지, 쿨다운, 턴 소유권을 계산하는 구조.
- 수용 신호:
  - battle started/updated/ended 이벤트가 Unity 연출과 기존 UI 상태를 함께 갱신한다.
  - reconnect 후 최신 snapshot 기준으로 Unity 장면을 복구할 수 있다.

## V6-E5: Safety, Performance, And Rollout

- 목표: Unity 통합이 제품 신뢰성을 해치지 않도록 fallback, 버전 관리, 성능 기준을 먼저 고정한다.
- 범위: Unity unavailable fallback, asset/version mismatch policy, smoke checklist, rollout guardrail.
- 제외: 네이티브 Unity 클라이언트 전환, Unity-owned game client 재설계.
- 수용 신호:
  - Unity 빌드 로드 실패가 전투 진행을 막지 않는다.
  - smoke checklist만으로 practice/battle/fallback 핵심 흐름을 검증할 수 있다.
