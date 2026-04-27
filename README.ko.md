# Gesture Skill Workspace

이 저장소는 브라우저 기반 손동작 제어 화면과 백엔드 명령 런타임을 위한 중립 스캐폴드입니다.

## 경계

- `FE/app`: 브라우저 앱, 라우트 셸, 손동작 제어 UI, 생성 API 클라이언트 경계.
- `BE/api`: 명령, 세션, 매핑, 감사 상태의 표준 쓰기 소유자.
- `BE/core`: 공유 도메인 값 객체와 순수 규칙.
- `BE/worker`: API 쓰기 소유권을 우회하지 않는 지연 또는 비동기 처리.
- `BE/api/contracts`: 표준 와이어 계약 원천.
- `scripts`: 저장소 소유 설정 및 검증 진입점.
- `infra/runtime`: 로컬 런타임 토폴로지 메모.
- `ops`: 운영 설정 자리.

## 로컬 진입점

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\bootstrap.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\check-boundaries.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\backend-check.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\frontend-check.ps1
```

로컬 패키지 도구가 이미 설치되어 있을 때만 `scripts\bootstrap.ps1`에 `-InstallDependencies`를 사용합니다.

## MVP 계획과 QA

### 한국어 문서

- `docs/implementation-artifacts/mvp-v1-implementation-plan.ko.md`: WebSocket 흐름, 서버 권위 규칙, 클라이언트 손 인식, 제외 범위를 포함한 MVP 구현 기준.
- `docs/planning-artifacts/mvp-v1/technology-stack.ko.md`: 선택한 MVP 기술스택, 경계, 보류 항목, 의존성 추가 규칙.
- `docs/planning-artifacts/mvp-v1/epics.ko.md`: MVP 구현 계획을 에픽 단위로 분리한 문서.
- `docs/planning-artifacts/mvp-v1/stories.ko.md`: 스토리 단위 구현 항목, 상태, 범위, 의존성, 검증 메모.
- `docs/planning-artifacts/mvp-v1/implementation-order.ko.md`: MVP 권장 구현 순서와 커밋 순서.
- `docs/planning-artifacts/mvp-v1/prerequisites.ko.md`: 제품, 계약, FE, BE, 입력 런타임, 영속성, QA 선행조건.
- `docs/implementation-artifacts/smoke-test-checklist.ko.md`: 저장소, 런타임, REST, WebSocket, 전투, 클라이언트 인식, E2E 검증 체크리스트.

### English Documents

- `README.en.md`
- `docs/implementation-artifacts/mvp-v1-implementation-plan.en.md`
- `docs/planning-artifacts/mvp-v1/technology-stack.en.md`
- `docs/planning-artifacts/mvp-v1/epics.en.md`
- `docs/planning-artifacts/mvp-v1/stories.en.md`
- `docs/planning-artifacts/mvp-v1/implementation-order.en.md`
- `docs/planning-artifacts/mvp-v1/prerequisites.en.md`
- `docs/implementation-artifacts/smoke-test-checklist.en.md`

## 스캐폴드 정책

- 문서와 제품 문구에서 외부 제공자 세부사항을 제외합니다.
- 카메라 프레임과 원시 랜드마크 스트림은 기본적으로 클라이언트에 둡니다.
- 확인된 명령 메타데이터만 백엔드로 보냅니다.
- 사용자에게 보이는 문구는 프론트엔드 로케일 카탈로그에 둡니다.
- 클라이언트 코드를 생성하거나 소비하기 전에 계약을 먼저 확장합니다.
