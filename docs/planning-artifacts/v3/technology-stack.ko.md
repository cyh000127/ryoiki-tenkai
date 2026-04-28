# v3 기술스택 결정 기록

v3는 새로운 제품 runtime을 선택하지 않고, 기존 v2 stack 위에 검증 자동화와 safe health summary를 추가합니다.

## 유지하는 스택

| 영역 | 선택 | v3 방침 |
| --- | --- | --- |
| Frontend runtime | React + Vite | 기존 browser app과 smoke fixture를 유지합니다. |
| Frontend verification | Vitest + browser smoke | fast/full 검증 모드에 맞춰 실행합니다. |
| Backend runtime | ASGI REST/WebSocket app | 기존 API process를 유지합니다. |
| Backend verification | pytest + ruff | health contract와 runtime state path를 검증합니다. |
| Local dependencies | Docker Compose | database/cache dependency와 compose config 검증을 유지합니다. |
| Handoff automation | PowerShell script | Windows local workspace 기준으로 반복 가능한 검증 entrypoint를 둡니다. |

## v3에서 추가하지 않는 것

| 영역 | 상태 | 이유 |
| --- | --- | --- |
| Concrete frame recognizer runtime | done | v2-12에서 browser frame signal runtime으로 연결되었습니다. |
| Skill/resource implementation | blocked | approved skill domain source가 필요합니다. |
| New external verification service | deferred | local reproducibility가 v3 목표입니다. |

## Dependency 규칙

- v3 handoff automation은 기존 command를 조합하며 새 package를 추가하지 않습니다.
- health summary는 secret, database URL, raw recognition data를 노출하지 않습니다.
- 새 dependency가 필요해지면 이 문서에 선택 근거와 fallback을 먼저 기록합니다.
