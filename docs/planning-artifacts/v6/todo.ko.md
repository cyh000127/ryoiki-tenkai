# v6 TODO

기준 시점: `2026-04-28`

이 문서는 현재 `v6` Unity renderer 통합에서 남아 있는 작업을 구현 순서 중심으로 정리한 TODO입니다.

## 현재 반영된 범위

- renderer port / registry / HTML fallback / Unity WebGL adapter
- skill presentation manifest seed
- practice camera overlay renderer
- practice recognizer 자동 시작
- Gojo 3종 mock WebGL placeholder preview

즉 지금은 `연습 화면에서 시각적으로 보이는 Unity 통합 감`까지는 확인 가능한 상태입니다.

## 우선순위 1. 실제 Unity WebGL build로 교체

- 목표: `mock.loader.js` 기반 placeholder를 실제 Unity Editor build 산출물로 대체합니다.
- 이유: 현재 preview는 브리지와 레이아웃 검증용으로는 충분하지만, 실제 Unity pipeline 검증은 아직 아닙니다.
- 현재 상태: 이 작업은 Unity Editor와 실제 build asset이 필요해 현재 저장소 코드만으로 완료할 수 없습니다. 대신 build 산출물 위치, `build.json` 계약, version mismatch fallback 정책을 먼저 고정합니다.
- 완료 기준:
  - Unity Editor build가 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/` 경로에서 로드됩니다.
  - practice scene이 mock runtime 없이 mount/unmount 됩니다.
  - local macOS 브라우저에서 smoke 확인을 남깁니다.

## 우선순위 2. Practice placeholder를 실제 timeline/prefab 재생기로 전환

- 목표: Gojo 3종 procedural placeholder를 실제 Unity asset 기반 재생기로 대체합니다.
- 이유: 현재 연출은 코드 기반 mock/procedural placeholder라 최종 룩앤필 검증이 어렵습니다.
- 완료 기준:
  - `jjk_gojo_red`
  - `jjk_gojo_hollow_purple`
  - `jjk_gojo_infinite_void`
  - 위 3개가 실제 Unity scene/timeline/prefab 기준으로 재생됩니다.

## 우선순위 3. Battle/Result Unity smoke 보강

- 목표: battle/result surface도 practice와 같은 수준으로 smoke를 남깁니다.
- 이유: 현재 practice는 시각적으로 많이 확인 가능하지만 battle/result는 실제 authoritative event 조합 검증이 더 필요합니다.
- 현재 상태: React battle/result renderer surface와 snapshot projection은 반영되어 있습니다. 남은 작업은 accepted/rejected/result replay를 renderer fallback 기준으로 회귀 테스트에 고정하는 것입니다.
- 완료 기준:
  - accepted action
  - rejected action
  - reconnect snapshot
  - ended result replay
  - 위 4개 케이스를 smoke checklist 또는 테스트 문서에 남깁니다.

## 우선순위 4. Hero 외 스킬 fallback 전략 정리

- 목표: Sukuna, Megumi 계열을 그냥 `없음`처럼 두지 않고 poster/video/html fallback 중 어떤 형태로 유지할지 고정합니다.
- 이유: practice에서 일부 스킬만 Unity로 보이고 나머지가 급격히 달라지면 사용자가 품질 차이를 버그처럼 느낄 수 있습니다.
- 현재 정책: `jjk_sukuna_malevolent_shrine`, `jjk_megumi_chimera_shadow_garden`은 실제 Unity asset이 붙기 전까지 `html-only` fallback으로 고정합니다. poster/video는 추후 자산이 준비될 때 manifest 확장으로만 추가합니다.
- 완료 기준:
  - `jjk_sukuna_malevolent_shrine`
  - `jjk_megumi_chimera_shadow_garden`
  - 각 스킬별 presentation mode와 임시 자산 정책이 문서에 고정됩니다.

## 우선순위 5. Version mismatch / missing asset 운영 정책

- 목표: React manifest와 Unity build가 어긋날 때의 fallback/로그/표시 정책을 구체화합니다.
- 이유: 지금은 fallback이 동작하지만 운영 중 원인 파악을 위한 기준이 더 필요합니다.
- 현재 정책:
  - `productVersion`이 React registry의 `buildVersion`과 다르면 Unity renderer를 시작하지 않습니다.
  - 스킬 presentation이 `unity`가 아니면 해당 surface만 HTML fallback으로 내려갑니다.
  - fallback 상태는 사용자에게 짧은 안내 문구로 표시하고, 전투/연습 흐름은 중단하지 않습니다.
- 완료 기준:
  - build version mismatch 시 fallback 규칙
  - missing clip/vfx/camera preset 시 fallback 규칙
  - 사용자 표시 문구와 개발 로그 기준
  - 위 항목이 문서 또는 테스트에 기록됩니다.

## 우선순위 6. Practice overlay UX polish

- 목표: camera 위에 renderer가 올라가도 recognizer mesh, 상태 badge, helper text가 서로 겹치지 않게 다듬습니다.
- 이유: 지금은 기능적으로 합쳐졌지만 더 큰 화면/작은 화면에서 HUD 밀도가 높아질 수 있습니다.
- 완료 기준:
  - desktop/mobile에서 overlay 정보 우선순위 정리
  - effect 강도와 mesh 가시성 조정
  - 필요하면 `renderer visibility toggle` 추가

## 우선순위 7. 문서와 smoke 갱신

- 목표: 실제 Unity build가 붙는 시점에 README, Unity scaffold 문서, smoke checklist를 다시 맞춥니다.
- 이유: 현재 문서는 mock placeholder까지는 반영했지만, 실제 build 산출물이 들어오면 실행 절차가 달라집니다.
- 완료 기준:
  - 로컬 실행 순서 갱신
  - Unity build 교체 절차 갱신
  - smoke checklist 갱신
