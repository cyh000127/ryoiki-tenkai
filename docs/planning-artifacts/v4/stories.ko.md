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

### V4-E1-ST02: 홈 화면 시동 패널

- Status: done
- Scope: 마이크 버튼, 인식 상태, transcript, 매칭 명령어, 실패/미지원 상태, 수동 시동 버튼.
- Acceptance criteria: 사용자가 홈 화면에서 음성 시동과 수동 fallback을 모두 실행할 수 있다.
- Dependencies: V4-E1-ST01, 기존 게스트/로드아웃/매칭 흐름.
- Verification: workspace UI regression test.

### V4-E1-ST03: 성공 시 기존 진입 흐름 재사용

- Status: done
- Scope: 세션 없음이면 게스트 생성, 로드아웃 미저장이면 로드아웃 화면 이동, 준비 완료면 매칭 시작.
- Acceptance criteria: 음성 명령이 새로운 backend route나 skill action을 만들지 않고 기존 action handler를 재사용한다.
- Dependencies: player profile query, loadout configured flag.
- Verification: workspace UI regression test.

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
- Acceptance criteria: 기능 완료 기준과 fallback 기준이 문서에 남는다.
- Dependencies: V4-E1 구현.
- Verification: implementation artifact review.
