# v6 구현 순서

v6는 `Unity를 붙인다`보다 `Unity를 어디까지 붙이지 않는지`를 먼저 고정해야 한다. 구현 순서는 아래와 같이 `경계 -> 데이터 -> 연습 -> 전투 -> 안정화` 순서를 따른다.

## 1. V6-E1 Unity Bridge Foundation

대상 스토리:

- `V6-E1-ST01`
- `V6-E1-ST02`
- `V6-E1-ST03`
- `V6-E1-ST04`

실행 순서:

- React가 의존할 renderer port를 먼저 만든다.
- `animsetId` 기반 renderer registry를 만든다.
- Unity WebGL mount lifecycle과 bridge event contract를 고정한다.
- 같은 port 위에서 기존 HTML fallback renderer를 계속 유지한다.

이 단계의 산출물:

- Unity adapter 없이도 돌아가는 renderer abstraction
- `unity-webgl` 과 `html-fallback` 선택 구조
- bridge event schema v1

## 2. V6-E2 Skill Presentation Model And Authoring Workflow

대상 스토리:

- `V6-E2-ST01`
- `V6-E2-ST02`
- `V6-E2-ST03`
- `V6-E2-ST04`

실행 순서:

- `skill presentation manifest` schema를 정의한다.
- 첫 Unity animset (`animset_unity_jjk`)과 hero skill starter set을 잡는다.
- 새 스킬 onboarding checklist를 문서와 검증 절차에 고정한다.
- 새 gesture token이 필요한 스킬은 recognizer 작업과 분리한다.

이 단계의 산출물:

- `skillId -> animsetId -> clip/vfx/camera` manifest
- hero skill starter set 기준
- 새 스킬 추가 체크리스트

## 3. V6-E3 Practice Renderer Integration

대상 스토리:

- `V6-E3-ST01`
- `V6-E3-ST02`
- `V6-E3-ST03`
- `V6-E3-ST04`

실행 순서:

- 연습 화면에 Unity renderer surface를 탑재한다.
- 현재 술식, 단계, 진행률, 완료 상태를 Unity로 투영한다.
- 기존 `연습 술식` 과 `저장된 로드아웃` 분리 UI를 유지한다.
- Unity 실패 시 poster/video 또는 HTML fallback preview로 내려온다.

이 단계의 산출물:

- practice scene projection
- practice fallback behavior
- 연습 화면 기준 smoke check

## 4. V6-E4 Battle Renderer Integration

대상 스토리:

- `V6-E4-ST01`
- `V6-E4-ST02`
- `V6-E4-ST03`
- `V6-E4-ST04`

실행 순서:

- 전투 보드에 Unity renderer surface를 탑재한다.
- authoritative battle snapshot을 Unity로 투영한다.
- accepted/rejected action timeline을 분리한다.
- reconnect/result replay를 snapshot 기준으로 복구한다.

이 단계의 산출물:

- battle scene projection
- authoritative action timeline
- reconnect/result replay support

## 5. V6-E5 Safety, Performance, And Rollout

대상 스토리:

- `V6-E5-ST01`
- `V6-E5-ST02`
- `V6-E5-ST03`

실행 순서:

- Unity unavailable fallback을 강제로 검증한다.
- manifest/build version mismatch 정책을 넣는다.
- 성능 예산과 smoke checklist를 기록하고 반복한다.

이 단계의 산출물:

- no-Unity survival path
- asset/version mismatch fallback
- release smoke checklist

## 작업 단위와 커밋 상한

한 작업당 최대 3커밋 원칙을 아래처럼 적용한다.

### 작업 1. Foundation + Presentation Model

- 포함 스토리: `V6-E1-ST01` 부터 `V6-E2-ST04`
- 최대 커밋: 3
- 권장 커밋:
  - `feat(frontend): animset renderer port와 unity bridge 기초 추가`
  - `feat(frontend): animset registry와 skill presentation manifest 추가`
  - `docs: unity integration spec과 onboarding checklist 정리`

### 작업 2. Practice Integration

- 포함 스토리: `V6-E3-ST01` 부터 `V6-E3-ST04`
- 최대 커밋: 3
- 권장 커밋:
  - `feat(frontend): practice unity surface와 fallback preview 추가`
  - `feat(frontend): practice progress projection과 loadout 분리 유지`
  - `test(frontend): practice unity/fallback smoke 보강`

### 작업 3. Battle Integration

- 포함 스토리: `V6-E4-ST01` 부터 `V6-E4-ST04`
- 최대 커밋: 3
- 권장 커밋:
  - `feat(frontend): battle unity surface와 snapshot projection 추가`
  - `feat(frontend): action timeline과 reconnect replay 추가`
  - `test(frontend): battle websocket projection 검증`

### 작업 4. Safety And Rollout

- 포함 스토리: `V6-E5-ST01` 부터 `V6-E5-ST03`
- 최대 커밋: 3
- 권장 커밋:
  - `feat(frontend): unity unavailable fallback과 mismatch guard 추가`
  - `docs: unity smoke checklist와 perf budget 정리`
  - `test(frontend): fallback regression 검증`

## 새 스킬 추가 작업의 커밋 상한

새 스킬 1개를 넣는 작업도 최대 3커밋을 넘기지 않는다.

1. `feat(domain): backend rule과 frontend catalog 동기화`
2. `feat(presentation): manifest와 unity asset mapping 추가`
3. `test/docs: recognizer coverage와 smoke note 정리`
