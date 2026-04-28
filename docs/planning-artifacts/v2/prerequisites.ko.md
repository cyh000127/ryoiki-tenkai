# v2 선행조건

이 문서는 v2 작업을 시작하거나 병합하기 전에 확인해야 할 조건을 정리합니다.

## 전역 선행조건

- v1 릴리스 준비 완료 문서를 기준으로 현재 완료 범위를 확인합니다.
- 구현 전에 해당 작업이 `stories.ko.md`의 `done`, `planned`, `blocked`, `deferred` 중 어디에 속하는지 확인합니다.
- 기술 선택 변경은 `technology-stack.ko.md`와 `technology-stack.en.md`에 먼저 반영합니다.
- 문서와 제품 문구는 승인되지 않은 외부 제공자명 또는 서비스명을 포함하지 않습니다.
- raw camera frame, raw landmark, raw tracking stream은 backend로 전송하거나 저장하지 않습니다.
- 기능 하나당 커밋은 최대 3개로 유지합니다.

## 스킬 구현 선행조건

스킬 구현은 아래 조건이 모두 충족될 때까지 시작하지 않습니다.

- 별도 domain source가 존재합니다.
- domain source가 최소한 다음 필드를 정의합니다.
  - stable skill id.
  - 표시 이름.
  - battle effect.
  - mana 또는 resource cost.
  - cooldown.
  - gesture sequence.
  - motion 또는 visual resource key.
  - version 또는 change note.
- skill effect와 gesture token의 검증 책임이 분리되어 있습니다.
- 승인된 source를 shared fixture, backend catalog, frontend default catalog에 어떻게 반영할지 합의되어 있습니다.
- missing resource fallback 정책이 정해져 있습니다.

위 조건이 없으면 스킬명, 효과, 이미지, 손동작 리소스, resource key를 임의로 만들지 않습니다.

## Recognition Runtime 선행조건

- browser-compatible recognizer runtime 선택 기준이 정해져야 합니다.
- adapter가 반환할 normalized observation shape가 정의되어야 합니다.
  - status.
  - token.
  - confidence.
  - stable duration.
  - reason.
- camera permission allowed/denied smoke가 유지되어야 합니다.
- stop/start/unmount lifecycle test 전략이 있어야 합니다.
- raw frame과 raw tracking data를 local boundary 밖으로 내보내지 않는지 확인해야 합니다.

## Backend 선행조건

- REST 또는 socket payload 변경 전 contract test를 업데이트합니다.
- server-authoritative battle rule을 유지합니다.
- state-mutating command는 stable action/request id를 가져야 합니다.
- storage 변경은 adapter boundary를 통과해야 합니다.
- match result, rating, history write는 idempotent해야 합니다.
- timeout, surrender, reconnect behavior를 바꾸면 backend socket/API test가 필요합니다.

## Frontend 선행조건

- user-facing text는 locale/copy catalog에 둡니다.
- camera state, hand state, local sequence state, server confirmation state를 혼합하지 않습니다.
- server confirmation 전에는 skill effect가 적용된 것처럼 보이지 않게 합니다.
- debug fallback 입력은 normal play surface와 분리합니다.
- layout 변경은 compact/desktop text overflow를 확인합니다.

## Persistence 선행조건

- adapter protocol을 우회해 repository에서 직접 파일 또는 database 세부사항을 다루지 않습니다.
- migration이 필요한 변경은 apply/reset/rollback 또는 recovery note를 포함합니다.
- storage load/save failure가 silent data loss로 이어지지 않게 정책을 정합니다.
- audit/history record는 compact metadata만 저장합니다.

## QA 선행조건

- 구현된 behavior에는 자동 검증을 붙입니다.
- docs-only 변경은 `git diff --check`와 provider-neutral scan을 실행합니다.
- FE 변경은 typecheck/test/build 중 영향 범위에 맞는 명령을 실행합니다.
- BE 변경은 ruff와 pytest를 실행합니다.
- camera/runtime 변경은 smoke fixture를 실행합니다.
- handoff 전 README와 implementation record link를 확인합니다.

## 구현을 멈춰야 하는 blocker

- 스킬 domain source가 없는데 skill/resource 구현을 요구합니다.
- recognizer runtime이 선택되지 않았는데 concrete adapter를 구현해야 합니다.
- backend가 raw recognition data 수신 또는 저장을 요구합니다.
- contract 없이 FE/BE payload를 서로 다르게 가정합니다.
- local에서 검증할 수 없는 behavior를 완료로 표시해야 합니다.
