# v6 스토리

상태 값:

- `done`: 현재 코드와 문서에 반영됨.
- `partial`: 브리지 또는 placeholder 수준으로 반영됐지만 실제 Unity asset/build 검증은 남음.
- `planned`: 구현 예정.
- `blocked`: 선행조건이 없어 구현하면 안 됨.
- `deferred`: v6 첫 통합 범위 밖으로 미룸.

## V6-E1: Unity Bridge Foundation

### V6-E1-ST01: Renderer Port와 책임 경계 분리

- Status: done
- Scope: React가 사용할 `animset renderer port`를 정의하고, React/FastAPI/Unity 각자의 책임을 명시한다.
- Acceptance criteria: Unity adapter가 없어도 같은 renderer port 위에서 기존 2D fallback renderer를 계속 사용할 수 있다.
- Dependencies: 현재 `animsetId` 저장 흐름, practice state model.
- Verification: `FE/app/tests/unit/animsetRegistry.test.ts`, `FE/app/tests/unit/AnimsetRendererSurface.test.tsx`, doc review.

### V6-E1-ST02: Unity WebGL Mount Lifecycle

- Status: partial
- Scope: practice surface에 Unity WebGL build를 mount/unmount 하고, resize/visibility/error lifecycle을 관리한다. battle/result surface는 후속 구현계획으로 둔다.
- Acceptance criteria: 화면 전환 또는 animset 교체 시 중복 mount 없이 renderer lifecycle이 정리된다.
- Dependencies: V6-E1-ST01, Unity WebGL build 산출물.
- Verification: React lifecycle은 구현됨. 실제 Unity Editor WebGL build 산출물의 practice smoke는 남음.

### V6-E1-ST03: Animset Registry와 Renderer 선택

- Status: done
- Scope: `animsetId` 별로 `unity-webgl` 또는 `html-fallback` renderer를 선택하는 registry를 둔다.
- Acceptance criteria: 같은 `skillId`라도 `animsetId`가 바뀌면 다른 renderer/연출 세트를 선택할 수 있다.
- Dependencies: loadout의 `equippedAnimsetId`, V6-E1-ST01.
- Verification: frontend unit test.

### V6-E1-ST04: Renderer Event Contract v1

- Status: done
- Scope: React -> Unity, Unity -> React 메시지 envelope와 필수 event type을 정의한다.
- Acceptance criteria: Unity는 JSON event를 받아 장면만 갱신하고, React는 gameplay authority를 잃지 않는다.
- Dependencies: V6-E1-ST01, practice projection 요구사항. battle projection은 같은 contract를 재사용하는 후속 범위다.
- Verification: bridge adapter contract test.

## V6-E2: Skill Presentation Model And Authoring Workflow

### V6-E2-ST01: Skill Presentation Manifest Schema

- Status: done
- Scope: `skillId`, `animsetId`, `clipId`, `impactVfxId`, `cameraPresetId`, `poster/preview`를 묶는 manifest schema를 정의한다.
- Acceptance criteria: 새 스킬 연출 추가가 코드 분기 대신 manifest 데이터 추가로 시작된다.
- Dependencies: V6-E1-ST03.
- Verification: schema validation test.

### V6-E2-ST02: Hero Skill Starter Set

- Status: partial
- Scope: v6 첫 통합은 `hero` 등급 스킬 3~4개만 Unity 연출을 제공하고, 나머지는 fallback renderer를 유지한다.
- Acceptance criteria: 연습장에서 대표 스킬 몇 개만으로도 Unity 이펙트 가치를 확인할 수 있다.
- Dependencies: V6-E2-ST01, 초기 Unity asset 제작.
- Verification: Gojo 3종 mock WebGL placeholder는 반영됨. 실제 Unity timeline/prefab asset smoke는 남음.

### V6-E2-ST03: 신규 스킬 Onboarding Checklist

- Status: partial
- Scope: 새 스킬 추가 시 `backend rule`, `frontend catalog`, `recognizer token`, `presentation manifest`, `Unity asset`, `smoke test` 순서를 문서화한다.
- Acceptance criteria: 팀원이 새 스킬 하나를 넣을 때 어디를 수정해야 하는지 문서만 보고 따라갈 수 있다.
- Dependencies: V6-E2-ST01.
- Verification: 기본 순서는 v6 문서에 있음. frontend skill effect manifest 경계는 구현됨. 실제 Unity asset 교체 절차와 신규 스킬별 authoring smoke는 남음.

### V6-E2-ST04: 신규 Gesture Token 경계

- Status: done
- Scope: 스킬 추가가 새 gesture token을 요구하는 경우 recognizer spec을 먼저 확정하고, token 없는 상태에서 Unity asset만 먼저 merge하지 않도록 규칙을 둔다.
- Acceptance criteria: `새 스킬 연출`과 `새 손동작 인식`이 서로 다른 작업임을 계획과 리뷰에서 분리한다.
- Dependencies: MediaPipe token catalog, recognizer owner 합의.
- Verification: doc review.

## V6-E3: Practice Renderer Integration

### V6-E3-ST01: Practice Surface 에 Unity Renderer 탑재

- Status: done
- Scope: 연습 화면 카메라 주변 또는 보조 패널에 Unity renderer surface를 탑재한다.
- Acceptance criteria: Unity surface가 연습 화면의 주 기능을 가리지 않고, 카메라 중심 레이아웃을 유지한다.
- Dependencies: V6-E1-ST02, V6-E1-ST03.
- Verification: responsive smoke check.

### V6-E3-ST02: Practice 진행 상태 투영

- Status: done
- Scope: 선택한 술식, 목표 sequence, 현재 단계, 진행률, 완료 상태를 React state에서 Unity event로 보낸다.
- Acceptance criteria: Unity가 연습 진행을 표시해도 실제 완료 판정은 기존 프론트 상태를 따른다.
- Dependencies: V6-E1-ST04, practice recognizer state.
- Verification: frontend unit test, manual camera smoke check.

### V6-E3-ST03: 연습 술식과 저장 로드아웃 분리 유지

- Status: done
- Scope: Unity 연출이 들어와도 `연습 중인 술식`과 `저장된 매칭 로드아웃`을 혼동하지 않도록 UI와 renderer 이벤트를 분리한다.
- Acceptance criteria: 사용자가 보고 있는 멋진 연출이 곧바로 매칭 loadout 저장을 의미하지 않는다.
- Dependencies: 기존 practice/loadout separation UI.
- Verification: workspace UI regression test.

### V6-E3-ST04: Practice Fallback Preview

- Status: done
- Scope: Unity unavailable, asset missing, unsupported 환경에서는 poster/webm/mp4 또는 기존 HTML UI로 연습 프리뷰를 대체한다.
- Acceptance criteria: Unity가 없어도 연습은 막히지 않는다.
- Dependencies: V6-E2-ST01, existing practice UI.
- Verification: forced fallback smoke check.

### V6-E3-ST05: Practice Skill Effect Activation Loop

- Status: done
- Scope: 손동작 sequence 완료 시 선택한 술식의 Unity 이펙트를 자동 발동하고, 이펙트 종료 후에도 사용자가 같은 스킬을 반복 연습할 수 있게 한다.
- Acceptance criteria: `practice.completed` 이벤트가 Unity renderer로 전달된다. 발동 상태가 너무 빨리 사라지지 않는다. `연습 초기화` 또는 스킬 재선택으로 반복 연습할 수 있다.
- Dependencies: V6-E3-ST02, MediaPipe runtime, skill presentation manifest.
- Verification: frontend unit test, manual camera smoke check. 구현 기록은 `docs/implementation-artifacts/v6-2-practice-effect-activation.ko.md`.

### V6-E3-ST06: Practice Unity Effect Quality Pass

- Status: partial
- Scope: Gojo 3종 이펙트를 연습장에서 실제로 식별 가능한 수준으로 고도화한다. 카메라 mesh, 상태 badge, helper text와 겹치지 않도록 overlay 우선순위를 조정한다.
- Acceptance criteria: `jjk_gojo_red`, `jjk_gojo_hollow_purple`, `jjk_gojo_infinite_void`가 서로 다른 발동 이펙트로 보인다. 사용자가 스킬이 발동됐는지 즉시 알 수 있다.
- Dependencies: V6-E2-ST02, Unity build 산출물 또는 mock runtime.
- Verification: visual smoke check, screenshot comparison note. Mock runtime 기준 1차 품질 개선은 완료됐고, 실제 Unity VFX 산출물 smoke는 남음.

## V6-E4: Future Battle Renderer Plan

### V6-E4-ST01: Battle Surface 에 Unity Renderer 탑재

- Status: deferred
- Scope: 전투 보드에 Unity renderer surface를 배치하되, HP/mana/turn UI와 입력 패널은 기존 웹 UI가 계속 담당한다.
- Acceptance criteria: Unity surface 추가 후에도 전투 조작과 정보 확인이 웹 UI 기준으로 가능하다.
- Dependencies: 연습장 Unity skill effect 안정화, battle workspace layout.
- Verification: future responsive smoke check.

### V6-E4-ST02: Authoritative Battle Snapshot Projection

- Status: deferred
- Scope: `battle.started`, 최신 battle snapshot, turn owner, HP/mana/cooldown 상태를 React에서 Unity로 투영한다.
- Acceptance criteria: Unity는 snapshot을 시각화하지만 수치를 직접 계산하지 않는다.
- Dependencies: battle WebSocket event handling, V6-E1-ST04, practice effect 안정화.
- Verification: future integration test with mocked battle events.

### V6-E4-ST03: Action Accepted/Rejected Timeline

- Status: deferred
- Scope: action accepted 시 skill timeline을, rejected 시 neutral/error timeline을 보여주도록 projection event를 설계한다.
- Acceptance criteria: Unity 연출이 거짓 성공을 보여주지 않고 authoritative 결과를 따른다.
- Dependencies: action request correlation data, V6-E2-ST01.
- Verification: future frontend unit test with mocked action results.

### V6-E4-ST04: Reconnect와 Result Replay

- Status: deferred
- Scope: active battle reconnect, ended battle result, 직전 결과 재진입 시 Unity 장면을 snapshot 기준으로 복구 또는 replay 한다.
- Acceptance criteria: 새로고침 또는 화면 이탈 후에도 battle/result surface가 깨지지 않는다.
- Dependencies: reconnect resync flow, V6-E4-ST02.
- Verification: future websocket reconnection smoke check.

## V6-E5: Safety, Performance, And Rollout

### V6-E5-ST01: Unity Unavailable Fallback

- Status: done
- Scope: Unity build load 실패, WebGL 미지원, bridge timeout 상황에서 기존 HTML/CSS renderer로 자동 복귀한다.
- Acceptance criteria: 연습 중 Unity가 죽어도 카메라 인식, 연습 진행, 연습 초기화 flow는 계속 동작한다.
- Dependencies: V6-E1-ST02, fallback renderer.
- Verification: forced loader failure smoke check.

### V6-E5-ST02: Version Mismatch와 Missing Asset Policy

- Status: done
- Scope: React manifest와 Unity build가 서로 다른 버전일 때의 fallback 정책과 로그 메시지를 정의한다.
- Acceptance criteria: asset이 없는 skill은 기본 timeline으로 대체되고, 앱 전체가 깨지지 않는다.
- Dependencies: V6-E2-ST01, build versioning.
- Verification: `FE/app/tests/unit/unityWebglRenderer.test.ts`, `FE/app/tests/unit/skillPresentationManifest.test.ts`, renderer fallback tests.

### V6-E5-ST03: 성능 예산 과 Smoke Checklist

- Status: done
- Scope: 초기 bundle budget, first render budget, 메모리 위험 구간, smoke checklist를 고정한다.
- Acceptance criteria: Unity 추가가 연습장 카메라 인식과 스킬 이펙트 확인 흐름을 망치지 않는지 반복 점검할 수 있다.
- Dependencies: Unity build, target browser range.
- Verification: `docs/implementation-artifacts/v6-4-practice-smoke-checklist.ko.md`, `scripts/v6-practice-smoke-check.ps1`.

### V6-E5-ST04: Unity Native Client 또는 Unity-Owned Battle Logic

- Status: deferred
- Scope: Unity가 직접 matchmaking, WebSocket, battle rules, camera recognizer를 가지는 별도 클라이언트 구조.
- Acceptance criteria: 별도 제품/아키텍처 재승인 없이는 v6 범위에 넣지 않는다.
- Dependencies: 제품 방향 재결정.
- Verification: not in v6.
