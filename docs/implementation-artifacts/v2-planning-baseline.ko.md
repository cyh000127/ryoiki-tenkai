# v2 planning baseline 구현 기록

## 목적

v2의 다음 구현 순서를 정리하되, 스킬 구현은 별도 도메인 명세가 확정될 때까지 시작하지 않도록 범위를 명확히 했습니다.

## 범위

- v2 에픽을 정의합니다.
- v2 스토리와 상태를 정의합니다.
- v2 구현 순서와 커밋 단위를 정의합니다.
- v2 선행조건을 정의합니다.
- v2 기술스택 유지/보류 결정을 정의합니다.
- 문서는 한국어와 영어 파일로 분리합니다.

## 산출물

- `docs/planning-artifacts/v2/epics.ko.md`
- `docs/planning-artifacts/v2/epics.en.md`
- `docs/planning-artifacts/v2/stories.ko.md`
- `docs/planning-artifacts/v2/stories.en.md`
- `docs/planning-artifacts/v2/implementation-order.ko.md`
- `docs/planning-artifacts/v2/implementation-order.en.md`
- `docs/planning-artifacts/v2/prerequisites.ko.md`
- `docs/planning-artifacts/v2/prerequisites.en.md`
- `docs/planning-artifacts/v2/technology-stack.ko.md`
- `docs/planning-artifacts/v2/technology-stack.en.md`

## 스킬 구현 보류 기준

스킬명, 스킬 효과, 손동작 리소스, 시각 자산, resource key는 별도 domain source가 없으면 구현하지 않습니다. v2 planning docs는 이 항목을 `blocked`로 기록하고, domain source 승인 후 fixture, API contract, frontend rendering을 업데이트하도록 순서를 분리했습니다.

## 검증

- `git diff --check`
- provider-neutral targeted text scan
