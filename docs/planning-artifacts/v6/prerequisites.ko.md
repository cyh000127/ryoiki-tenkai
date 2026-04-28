# v6 선행조건

## 제품 조건

- Unity는 v6에서 `연출 renderer`이지 `게임 로직 엔진`이 아니다.
- FastAPI battle rules, React navigation/state, browser camera recognizer는 계속 유지한다.
- 첫 릴리즈는 hero skill 3~4개와 1개의 Unity animset으로 시작한다.
- practice와 battle은 Unity가 없어도 기능적으로 계속 플레이 가능해야 한다.
- 연습 중인 술식과 저장된 매칭 로드아웃 분리 원칙은 Unity 통합 후에도 유지한다.

## 기술 조건

- 통합 대상은 `Unity WebGL`이다.
- React 화면이 Unity surface를 mount/unmount 할 수 있어야 한다.
- Unity build 산출물과 React manifest는 같은 버전 키를 공유해야 한다.
- bridge event schema는 버전 필드 또는 최소 호환 규칙을 가져야 한다.
- MediaPipe recognizer는 계속 브라우저에서 돌고, Unity는 인식 결과를 표시만 한다.

## 자산 조건

- 모든 Unity 대상 스킬은 안정적인 `skillId`를 가져야 한다.
- animset 별로 `clipId`, `impactVfxId`, `cameraPresetId` 명명 규칙이 있어야 한다.
- poster/preview 자산은 runtime source가 아니라 fallback/documentation 용도로 관리한다.
- GIF는 제품 기본 포맷이 아니라 문서/공유 파생 포맷으로만 사용한다.

## 팀 조건

- frontend owner, backend owner, Unity asset owner가 최소한 story 단위로 구분되어야 한다.
- 새 스킬 추가 시 `rule`, `recognizer`, `presentation` 중 어느 층을 건드리는지 먼저 선언해야 한다.
- hero skill starter set은 구현 전에 확정해야 한다.

## 구현 중단 조건

- Unity가 직접 matchmaking, WebSocket, battle rules를 가져야 한다는 요구가 나오면 v6 범위를 중단하고 별도 재설계를 먼저 한다.
- 새 스킬이 새 gesture token을 요구하지만 recognizer spec owner 합의가 없으면 그 스킬 integration을 중단한다.
- Unity build 크기나 메모리 사용량이 기존 웹 플레이를 실질적으로 망치면 hero skill 범위를 줄이고 재측정한다.
- 모바일 저사양 브라우저를 1차 필수 타깃으로 올리려면 별도 성능 검증 전에는 범위를 확장하지 않는다.
