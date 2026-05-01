# v6 구현 순서

v6의 현재 구현 순서는 `연습 UX -> Unity 스킬 이펙트 -> 반복 연습 안정화 -> fallback/성능 -> 전투 후속 계획`이다.

전투는 지금 구현 완료 목표가 아니다. 현재 제품 목표는 사용자가 연습장에서 혼자 스킬을 선택하고, 손동작을 성공시키고, Unity 이펙트로 술식 발동을 확인하는 것이다.

## 1. Practice UX 기준 재정렬

대상 스토리:

- `V6-E3-ST01`
- `V6-E3-ST02`
- `V6-E3-ST03`
- `V6-E3-ST05`

실행 순서:

- 연습 화면을 카메라와 스킬 이펙트 중심으로 유지한다.
- 연습 중인 술식, 현재 단계, 인식 상태, 이펙트 상태를 한 화면에서 확인하게 한다.
- 손동작 sequence 완료 후 자동으로 스킬 발동 상태로 넘어간다.
- 한 번 발동했다고 연습이 끝나지 않게 `연습 초기화`와 스킬 재선택 흐름을 유지한다.

완료 기준:

- 연습 탭 진입 후 카메라가 자동 시작된다.
- 사용자가 스킬 하나를 선택하면 해당 스킬의 이름, 손동작, 이펙트 상태가 보인다.
- sequence 완료 시 Unity renderer가 `practice.completed`를 받아 이펙트를 재생한다.
- 같은 스킬을 반복 연습할 수 있다.

## 2. Unity 스킬 이펙트 구현

대상 스토리:

- `V6-E2-ST01`
- `V6-E2-ST02`
- `V6-E3-ST06`

실행 순서:

- `skillId + animsetId` 기준 presentation manifest를 유지한다.
- Gojo 3종을 우선 이펙트 품질 검증 대상으로 둔다.
  - `jjk_gojo_red`
  - `jjk_gojo_hollow_purple`
  - `jjk_gojo_infinite_void`
- 현재 mock/procedural placeholder를 실제 Unity scene/timeline/prefab 재생기로 교체한다.
- 이펙트가 카메라 mesh와 상태 HUD를 가리지 않도록 overlay 레이어 우선순위를 조정한다.

완료 기준:

- 3개 hero skill이 실제 Unity WebGL build에서 재생된다.
- 이펙트 시작, 유지, 종료 상태가 React practice state와 어긋나지 않는다.
- 이펙트가 보이지 않는 경우 HTML fallback이 명확히 표시된다.

## 3. 실제 Unity WebGL Build 교체

대상 스토리:

- `V6-E1-ST02`
- `V6-E5-ST02`

실행 순서:

- Unity Editor에서 WebGL build를 생성한다.
- build 산출물을 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/Build`에 둔다.
- `build.json`의 `loaderUrl`, `dataUrl`, `frameworkUrl`, `codeUrl`, `productVersion`을 실제 산출물과 맞춘다.
- `productVersion`과 React registry `buildVersion`이 다르면 HTML fallback으로 내려가게 한다.

완료 기준:

- mock loader 없이 practice renderer가 mount/unmount 된다.
- 실제 Unity build가 `practice.skill_selected`, `practice.progress_updated`, `practice.completed` 이벤트를 받는다.
- version mismatch 시 연습 흐름이 깨지지 않는다.

## 4. Hero 외 스킬 Fallback 정책

대상 스토리:

- `V6-E2-ST02`
- `V6-E3-ST04`
- `V6-E5-ST01`

실행 순서:

- Sukuna/Megumi 계열은 실제 Unity asset 전까지 `html-only` fallback으로 고정한다.
- poster/video fallback은 임시 자산이 준비될 때만 manifest에 추가한다.
- 사용자가 fallback을 버그로 오해하지 않도록 연습 화면 문구를 짧고 명확하게 유지한다.

완료 기준:

- `jjk_sukuna_malevolent_shrine`, `jjk_megumi_chimera_shadow_garden`은 빈 Unity 화면으로 보이지 않는다.
- Unity asset이 없는 스킬도 연습 진행 자체는 가능하다.

## 5. Practice Smoke와 성능 기준

대상 스토리:

- `V6-E5-ST03`

실행 순서:

- desktop/mobile viewport에서 카메라, 손 mesh, Unity effect, 상태 badge가 겹치지 않는지 확인한다.
- Unity load 실패, asset missing, version mismatch를 강제로 확인한다.
- first render, effect start latency, memory risk를 기록한다.

완료 기준:

- practice smoke checklist가 문서화된다.
- Unity 실패 시에도 연습 UI가 멈추지 않는다.
- effect visibility toggle이 필요하면 이 단계에서 추가한다.

## 6. Future Battle Renderer Plan

대상 스토리:

- `V6-E4-ST01`
- `V6-E4-ST02`
- `V6-E4-ST03`
- `V6-E4-ST04`

상태:

- 후속 구현계획.
- 연습장 스킬 이펙트가 안정화되기 전에는 전투 renderer 완성을 목표로 잡지 않는다.

착수 조건:

- 연습 화면에서 최소 3개 hero skill의 Unity 이펙트가 실제 build 또는 충분한 품질의 placeholder로 검증된다.
- 스킬 발동 이펙트와 손동작 인식 흐름이 반복 연습에서 안정적이다.
- battle action accepted/rejected/result replay의 제품 UX가 별도 승인된다.

## 작업 단위와 커밋 상한

한 작업당 최대 3커밋 원칙을 유지한다.

### 작업 1. Practice UX 정렬

- 권장 커밋:
  - `docs: practice first 구현 순서 정리`
  - `feat(frontend): practice effect 상태와 반복 연습 UX 정리`
  - `test(frontend): practice effect flow 검증`

### 작업 2. Unity Effect 품질 개선

- 권장 커밋:
  - `feat(renderer): hero skill unity effect 재생 개선`
  - `feat(frontend): practice renderer event projection 보강`
  - `test(frontend): unity practice effect fallback 검증`

### 작업 3. 실제 Unity Build 교체

- 권장 커밋:
  - `chore(renderer): unity webgl build 산출물 교체`
  - `feat(frontend): unity build version guard 보강`
  - `docs: unity build smoke 절차 갱신`

### 작업 4. Future Battle Plan

- 권장 커밋:
  - `docs: battle renderer 후속 구현계획 정리`
