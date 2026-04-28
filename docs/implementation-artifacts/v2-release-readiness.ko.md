# v2 release readiness 재점검

이 문서는 현재 v2 진행 상태를 기준으로 release 판단을 분리해 기록합니다. 현재 브랜치는 v2 문서/QA checkpoint는 인수인계 가능하지만, full v2 feature release는 아직 준비 완료가 아닙니다.

## 판정

- 판정일: `2026-04-28`
- 기준 브랜치: `main`
- v2 checkpoint 판정: 문서/QA 기준 인수인계 가능
- full v2 feature release 판정: 준비 미완료
- 릴리스 판단 근거:
  - 완료된 v2 hardening 항목은 implementation record와 smoke checklist에 연결되어 있습니다.
  - planned 항목과 blocked 항목이 v2 story와 smoke checklist에서 분리되어 있습니다.
  - 스킬 구현은 별도 domain source 확정 전까지 시작하지 않는 것으로 명시되어 있습니다.

## 완료된 v2 checkpoint

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| Live recognizer adapter boundary | PASS | `docs/implementation-artifacts/v2-1-live-recognizer-adapter.ko.md` |
| Camera permission smoke automation | PASS | `docs/implementation-artifacts/v2-2-camera-permission-smoke.ko.md` |
| Storage adapter persistence | PASS | `docs/implementation-artifacts/v2-3-storage-adapter-persistence.ko.md` |
| SQL migration smoke procedure | PASS | `docs/implementation-artifacts/v2-sql-migration-smoke.ko.md` |
| Storage failure/fallback policy | PASS | `docs/implementation-artifacts/v2-storage-failure-policy.ko.md` |
| Compact audit retention boundary | PASS | `docs/implementation-artifacts/v2-audit-retention-boundary.ko.md` |
| v2 planning baseline | PASS | `docs/implementation-artifacts/v2-planning-baseline.ko.md` |
| v2 smoke checklist | PASS | `docs/implementation-artifacts/v2-smoke-checklist.ko.md` |
| v2 release readiness 재점검 | PASS | 이 문서 |
| Provider-neutral scan 기록 | PASS | 이 문서의 검증 섹션 |

## v2 story 상태 요약

| Epic | 현재 상태 | 비고 |
| --- | --- | --- |
| V2-E1 Live Recognition Runtime Hardening | partial | adapter boundary와 camera smoke는 완료, concrete runtime 선택과 UX hardening은 남아 있음 |
| V2-E2 Persistence and Runtime Operation Readiness | done | storage adapter 전환, migration smoke, failure policy, audit retention boundary가 완료됨 |
| V2-E3 Real Match Flow and Session Robustness | planned | real two-player pairing, reconnect, event reconciliation, fanout hardening이 남아 있음 |
| V2-E4 Skill and Resource Domain Intake | blocked | approved skill domain source가 필요함 |
| V2-E5 QA, Release, and Handoff | done | planning baseline, smoke checklist, readiness, scan 기록이 완료됨 |

## full v2 release blockers

아래 항목이 완료되기 전까지 full v2 feature release는 준비 완료로 보지 않습니다.

- `V2-E1-ST02`: concrete frame recognizer runtime 선택 및 adapter 결합.
- `V2-E1-ST03`: no-hand, unstable-hand, recognized-token 상태의 시각적 분리.
- `V2-E1-ST04`: recognizer restart, cleanup, permission recovery hardening.
- `V2-E3-ST01`부터 `V2-E3-ST04`: real two-player match flow와 session robustness.
- `V2-E4-ST01`부터 `V2-E4-ST04`: approved skill domain source 이후의 skill/resource intake.

## 보류 기준

스킬명, 스킬 효과, gesture sequence 변경, 손동작 리소스, 시각 자산, resource key는 별도 domain source가 없으면 구현하지 않습니다. 현재 v2 release 판단에서 이 영역은 blocker가 아니라 승인 대기 상태입니다.

## 검증

이번 readiness 재점검은 docs-only 변경으로 진행합니다.

| 검증 항목 | 상태 | 비고 |
| --- | --- | --- |
| `git diff --check` | PASS | whitespace/error check |
| Provider-neutral targeted text scan | PASS | 무시 대상 파일 외 매칭 없음 |
| README link review | PASS | v2 readiness 문서가 한국어/영어 링크에 포함됨 |
| Story status review | PASS | `V2-E5-ST03`, `V2-E5-ST04` 완료 상태 반영 |

## 다음 구현 순서

스킬 domain source가 아직 없으므로 다음 안전한 구현 단위는 승인된 기존 runtime boundary 안에서 진행합니다.

1. `V2-E1-ST03`: no-hand, unstable-hand, recognized-token 상태 분리.
2. `V2-E3-ST01`: two-player queue pairing rule 강화.
3. `V2-E3-ST02`: socket reconnect와 latest snapshot 재동기화 hardening.
