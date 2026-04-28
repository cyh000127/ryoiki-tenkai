# MVP v1 스모크 테스트 체크리스트

FE, BE, 입력 런타임 변경 후 로컬 인수인계 검증에 사용합니다. 관찰한 동작이 서버 권위 MVP 계획과 일치할 때만 완료로 표시합니다.

## 릴리스 검증 스냅샷

- 검증일: `2026-04-28`
- 릴리스 판정: v1 기능 MVP 릴리스 준비 완료
- 릴리스 차단 항목: 없음
- 검증 근거:
  - `uv run ruff check BE`
  - `uv run pytest BE`
  - `pnpm --dir FE/app typecheck`
  - `pnpm --dir FE/app test`
  - `pnpm --dir FE/app build`
  - `scripts\check-boundaries.ps1`
  - `docker compose -f docker-compose.yml config --quiet`
  - `git diff --check`
- 상세 문서: `docs/implementation-artifacts/v1-release-readiness.ko.md`

## 저장소와 문서

- [ ] `scripts\check-boundaries.ps1`가 저장소 루트에서 통과한다.
- [ ] `scripts\backend-check.ps1`가 저장소 루트에서 통과한다.
- [ ] `scripts\frontend-check.ps1`가 저장소 루트에서 통과한다.
- [ ] README가 MVP 계획과 이 스모크 체크리스트를 가리킨다.
- [ ] MVP 제외 문구가 있고 외부 제공자 또는 보류된 전송 제품명을 언급하지 않는다.
- [ ] 요청된 금칙성 용어 스캔이 무시된 lock file 외에는 매칭을 반환하지 않는다.

## 로컬 런타임

- [ ] 백엔드 런타임이 import, migration, configuration 오류 없이 시작한다.
- [ ] 프론트엔드 런타임이 시작되고 첫 playable screen을 렌더링한다.
- [ ] 필요한 로컬 서비스가 문서화된 기본값으로 시작한다.
- [ ] 선택 설정 누락은 명확한 로컬 오류 메시지를 낸다.
- [ ] 로그는 camera frame 또는 raw tracking data를 노출하지 않고 request, socket session, battle session, action identifier를 식별한다.

## REST 설정 흐름

- [ ] guest 또는 simple player creation이 stable player identifier와 usable token을 반환한다.
- [ ] profile lookup이 nickname, rating, record, current loadout을 반환한다.
- [ ] skillset list가 서버 승인 gesture sequence와 cost/cooldown metadata를 반환한다.
- [ ] animset list가 선택 가능한 metadata를 반환한다.
- [ ] loadout update가 valid selection을 수락하고 invalid selection을 standard error shape로 거부한다.
- [ ] matchmaking queue entry, cancel, status endpoint가 반복 호출에서도 일관되게 동작한다.

## WebSocket 흐름

- [ ] valid player session에 대해 socket token issuance가 성공한다.
- [ ] WebSocket connection은 valid token으로 성공하고 invalid token으로 명확히 실패한다.
- [ ] match-ready와 match-found event가 polling-only behavior 없이 client를 queue에서 battle로 이동시킨다.
- [ ] battle-started event가 turn number, turn owner, deadline, HP, mana, cooldown, visible battle status를 초기화한다.
- [ ] ping 또는 heartbeat 동작으로 connection state를 관찰할 수 있다.
- [ ] reconnect가 최신 server snapshot에서 state를 복구한다.

## 전투 엔진

- [ ] 플레이어 턴의 valid action submission이 accepted와 state update를 반환한다.
- [ ] accepted action이 mana cost, HP change, cooldown change, battle log entry, next turn owner를 정확히 한 번 적용한다.
- [ ] duplicate `action_id`가 state mutation을 중복하지 않는다.
- [ ] out-of-turn action이 state mutation 없이 거부된다.
- [ ] invalid gesture sequence가 state mutation 없이 거부된다.
- [ ] insufficient mana와 active cooldown path가 state mutation 없이 거부된다.
- [ ] turn timeout이 문서화된 rule에 따라 turn을 진행하거나 battle을 해결한다.
- [ ] surrender가 battle을 종료하고 올바른 result를 기록한다.
- [ ] HP depletion이 battle을 종료하고 final state를 emit하며 rating과 match history를 갱신한다.

## 클라이언트 손 인식

- [ ] camera permission allowed 상태가 camera-ready와 hand-detected feedback을 보여준다.
- [ ] camera permission denied 상태가 명확한 blocked state를 보여주고 battle action submission으로 들어가지 않는다.
- [ ] no-hand, unstable-hand, recognized-gesture state가 시각적으로 구분된다.
- [ ] sequence progress가 current step, remaining steps, reset 또는 timeout state를 보여준다.
- [ ] local recognition success가 server confirmation 전에는 skill effect를 적용하지 않는다.
- [ ] local failure reason과 server rejection reason이 분리된다.
- [ ] test 또는 fallback input이 반복 가능한 smoke check를 위해 known valid sequence를 제출할 수 있다.

## 엔드투엔드 플레이 루프

- [ ] clean browser session에서 시작해 player를 생성하거나 복구한다.
- [ ] loadout을 선택하고 ranked 1v1 queue에 진입한다.
- [ ] match를 수신하고 battle로 전환한다.
- [ ] WebSocket을 통해 최소 한 번 valid action round trip을 완료한다.
- [ ] invalid action path를 한 번 완료하고 server state mutation이 없는지 확인한다.
- [ ] win/loss, timeout, surrender 중 하나로 battle을 종료한다.
- [ ] result screen이 winner, rating delta, end reason, next action을 보여준다.
- [ ] history 또는 rating screen이 완료된 match를 반영한다.

## 릴리스 게이트

- [x] 위 critical smoke item이 모두 통과하거나 blocker가 문서화되어 있다.
- [x] known gap이 MVP exclusion 또는 follow-up work로 표시되어 있다.
- [x] 이 체크리스트 업데이트만으로 FE, BE, 입력 런타임 source change가 필요하지 않다.
