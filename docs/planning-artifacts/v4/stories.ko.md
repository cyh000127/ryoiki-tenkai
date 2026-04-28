# v4 스토리

상태 값:

- `done`: 현재 브랜치에 구현됨.
- `planned`: 구현 가능하지만 아직 시작하지 않음.
- `blocked`: 선행 명세 또는 선택이 없어 구현하면 안 됨.
- `deferred`: v4 밖으로 미룰 수 있음.

## V4-E1: Japanese Voice Startup Command

### V4-E1-ST01: 일본어 음성 명령 매칭 모델

- Status: done
- Scope: `ja-JP` speech recognition wrapper, 기본 명령어 배열, transcript 정규화, 키워드 포함 매칭.
- Acceptance criteria: `術式を起動して` 같은 문장이 `起動して`를 포함하면 성공으로 판정한다.
- Dependencies: 브라우저 speech recognition 지원 여부.
- Verification: frontend unit test.

### V4-E1-ST02: 홈 화면 시작 패널

- Status: done
- Scope: 마이크 버튼, 인식 상태, transcript, 매칭 명령어, 실패/미지원 상태, 마이크 없이 시작 버튼.
- Acceptance criteria: 사용자가 홈 화면에서 음성 시작과 마이크 없는 시작 경로를 모두 실행할 수 있다.
- Dependencies: V4-E1-ST01, 기존 게스트/로드아웃/매칭 흐름.
- Verification: workspace UI regression test.

### V4-E1-ST03: 성공 시 기존 진입 흐름 재사용

- Status: done
- Scope: 세션 없음이면 게스트 생성, 로드아웃 미저장이면 로드아웃 화면 이동, 준비 완료면 매칭 시작.
- Acceptance criteria: 음성 명령이 새로운 backend route나 skill action을 만들지 않고 기존 action handler를 재사용한다.
- Dependencies: player profile query, loadout configured flag.
- Verification: workspace UI regression test.

### V4-E1-ST04: STT 모듈 경계 분리

- Status: done
- Scope: 브라우저 speech recognition 세부 타입과 lifecycle을 공용 transcript recognizer port로 분리.
- Acceptance criteria: 시작 명령 모델은 STT 구현 세부를 직접 다루지 않고 transcript와 상태만 받는다.
- Dependencies: V4-E1-ST01.
- Verification: browser speech module unit test, startup voice command unit test.

## V4-E2: Command Customization Readiness

### V4-E2-ST01: 명령어 소스 분리

- Status: done
- Scope: 명령어 세트와 매칭 함수를 UI 컴포넌트 밖 feature model에 둔다.
- Acceptance criteria: command array 교체만으로 새 명령어를 추가할 수 있다.
- Dependencies: V4-E1-ST01.
- Verification: module import and unit test.

### V4-E2-ST02: 사용자 커스텀 명령어

- Status: deferred
- Scope: 계정별 명령어 저장, 편집 UI, 충돌 처리.
- Acceptance criteria: 사용자가 직접 문구를 등록하고 활성화할 수 있다.
- Dependencies: 설정 저장 정책과 개인정보 보존 기준.
- Verification: future settings test.

### V4-E2-ST03: STT 이후 손동작 입력 활성화 플로우

- Status: blocked
- Scope: STT 명령 인식 후 손동작 입력을 활성화하고, 승인된 스킬 도메인에 따라 skill action 후보를 판정.
- Acceptance criteria: STT는 trigger만 담당하고, 손동작 sequence와 스킬 효과는 approved skill domain source를 따른다.
- Dependencies: approved skill domain source.
- Verification: future gesture-to-skill integration test.

### V4-E2-ST04: 캐릭터/스킬/STT 후보 카탈로그 작성

- Status: done
- Scope: 주술회전 Phase 1 캐릭터/스킬/STT trigger 후보와 오리지널 확장 후보를 분리해 정리.
- Acceptance criteria: 주술회전 고유명은 Phase 1 카탈로그에 저장하고, 내부 손모양은 추후 구현 계획으로 분리한다.
- Dependencies: 사용자 제공 참고자료.
- Verification: `docs/product/jujutsu-character-skill-stt-catalog.ko.md`, `docs/product/character-skill-stt-catalog.ko.md`, `docs/implementation-artifacts/v4-3-character-skill-stt-intake.ko.md`.

## V4-E3: Voice Startup Release Evidence

### V4-E3-ST01: v4 계획 문서 작성

- Status: done
- Scope: 기술스택, 에픽, 스토리, 구현 순서, 선행조건을 한국어/영어로 작성.
- Acceptance criteria: README에서 v4 문서를 찾을 수 있다.
- Dependencies: 사용자 제안서 검토.
- Verification: doc link review.

### V4-E3-ST02: 구현 기록 작성

- Status: done
- Scope: 구현 결정, 완료 범위, 제외 범위, 검증 결과를 한국어/영어로 기록.
- Acceptance criteria: 기능 완료 기준과 마이크 없는 시작 기준이 문서에 남는다.
- Dependencies: V4-E1 구현.
- Verification: implementation artifact review.
