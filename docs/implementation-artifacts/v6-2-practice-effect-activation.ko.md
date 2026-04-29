# v6-2 Practice Effect Activation 구현 기록

기준 시점: `2026-04-29`

## 목적

현재 v6의 핵심은 전투가 아니라 `연습장에서 혼자 술식을 써보는 경험`이다. 이번 구현은 손동작 sequence가 완료됐을 때 선택한 스킬 이펙트가 자연스럽게 발동되고, 사용자가 같은 스킬을 반복 연습할 수 있도록 하는 데 집중한다.

## 반영 범위

1. Practice skill activation loop
   - `practice.completed` 이벤트를 mock Unity runtime의 명확한 발동 trigger로 사용한다.
   - 진행률 이벤트가 들어올 때마다 발동 시간이 계속 초기화되던 동작을 제거했다.
   - 완료 후 이펙트가 즉시 사라지지 않고 sustain 상태로 유지되게 했다.

2. Gojo 3종 placeholder effect 품질 개선
   - `jjk_gojo_red`: 차징 orb, 발사 trail, 충돌 ring, impact spoke를 강화했다.
   - `jjk_gojo_hollow_purple`: 적/청 결합, 중앙 purple core, 관통 beam, 충돌 ring을 강화했다.
   - `jjk_gojo_infinite_void`: 영역형 dome, star/shard field, 지속 ring을 강화했다.

3. 반복 연습 UX
   - 완료 후 camera 위에 `술식 발동 완료` 상태를 별도 overlay로 표시한다.
   - `연습 초기화` 또는 스킬 재선택으로 같은 스킬을 다시 연습할 수 있는 기존 흐름을 유지한다.
   - 손 mesh, 상태 badge, renderer overlay가 동시에 보이도록 z-index와 위치를 조정했다.

4. 실제 Unity WebGL build 교체
   - 현재 저장소에는 Unity Editor가 생성한 WebGL build 산출물이 없다.
   - 따라서 이번 커밋에서는 실제 build 교체를 완료하지 않고, `mock.loader.js` 기반 runtime을 bridge-compatible placeholder로 강화했다.
   - 실제 교체는 Unity Editor build 산출물이 준비된 뒤 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/Build`와 `build.json`을 교체하는 방식으로 진행한다.

5. Hero 외 스킬 fallback 유지
   - `jjk_sukuna_malevolent_shrine`, `jjk_megumi_chimera_shadow_garden`은 실제 Unity asset 전까지 `html-only` fallback을 유지한다.
   - fallback 스킬도 연습 완료 상태와 activation 표시를 검증할 수 있게 테스트를 추가했다.

## 검증 기준

- 연습장에서 손동작 sequence 완료 시 `practice.completed`가 renderer로 전달된다.
- 완료 이펙트가 너무 빠르게 사라지지 않는다.
- Gojo 3종은 서로 다른 시각 패턴으로 구분된다.
- fallback 스킬은 빈 Unity 화면으로 가지 않고 HTML fallback을 사용한다.
- 실제 Unity build 교체는 산출물 확보 후 별도 smoke로 검증한다.
