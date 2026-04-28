# v4 구현 순서

## 1. 명령어 모델

- `ja-JP` speech recognition wrapper를 feature model로 분리한다.
- 기본 명령어 배열과 정규화 함수를 작성한다.
- 키워드 포함 매칭을 단위 테스트로 고정한다.

## 2. 홈 화면 통합

- 홈 화면에 음성 시동 패널을 추가한다.
- 상태는 `idle`, `listening`, `matched`, `rejected`, `unsupported`, `blocked`, `error`로 분리한다.
- 성공 시 기존 handler를 재사용한다.
  - 세션 없음: 게스트 생성
  - 로드아웃 미저장: 로드아웃 화면
  - 준비 완료: 매칭 시작

## 3. fallback과 예외 처리

- 미지원 또는 권한 거부 상태를 화면에 표시한다.
- 수동 시동 버튼을 항상 제공한다.
- transcript와 matched command는 UI 상태에만 유지한다.

## 4. 문서와 검증

- v4 계획 문서와 구현 기록을 한국어/영어로 추가한다.
- README에 v4 링크와 현재 상태를 추가한다.
- frontend typecheck, unit test, build를 실행한다.

## 커밋 단위

- 권장 커밋: `feat(frontend): 일본어 음성 시동 명령 추가`
- 포함 범위: docs, frontend model, home UI, tests.
- 이유: 한 기능의 문서/구현/검증을 한 단위로 추적해 push 수를 줄인다.
