# v3 선행조건

## 전역 선행조건

- v2 readiness의 blocked 항목을 먼저 확인합니다.
- recognizer runtime binding은 v2-12 구현 기록을 기준으로 확인합니다.
- approved skill domain source가 없으면 skill/resource 구현을 시작하지 않습니다.
- 문서와 product copy는 승인되지 않은 외부 제공자명 또는 서비스명을 포함하지 않습니다.
- raw camera frame, raw landmark, raw tracking stream은 backend로 보내거나 저장하지 않습니다.
- 기능 하나당 커밋은 최대 3개로 유지합니다.

## Verification 선행조건

- local machine에서 `uv`, `pnpm`, Docker Compose가 사용 가능해야 합니다.
- fast mode는 빠른 피드백을 위해 FE typecheck/test, BE lint/test, boundary, compose config, provider-neutral scan을 포함합니다.
- full mode는 fast mode에 camera smoke와 frontend build를 추가합니다.
- plan-only mode는 실행할 command를 출력하고 종료합니다.

## Runtime Health 선행조건

- health endpoint는 credential, database URL, raw recognition data를 노출하지 않습니다.
- storage mode는 safe summary로만 표현합니다.
- API contract 변경 전후 테스트를 갱신합니다.
- health가 readiness를 대신하지 않습니다. 상세 검증은 handoff script가 담당합니다.

## 구현 중단 조건

- skill domain source가 없는데 skill/resource 구현을 완료로 표시해야 합니다.
- provider-neutral scan에서 승인되지 않은 외부명 또는 서비스명이 발견됩니다.
- health 응답이 secret 또는 raw recognition data를 노출합니다.
- 검증 command가 local에서 재현되지 않습니다.
