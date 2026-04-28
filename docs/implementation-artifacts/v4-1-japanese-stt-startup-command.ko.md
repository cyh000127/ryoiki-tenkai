# v4-1 일본어 음성 시작 명령 구현 기록

## 목적

무료로 빠르게 적용 가능한 일본어 음성 시작 명령을 홈 화면에 추가한다. 음성 명령은 앱 시작 흐름을 돕는 entry command이며, 전투 스킬 발동이나 gesture sequence 판정과는 분리한다.

## 구현 결정

- Web Speech API 호환 브라우저 speech recognition을 사용한다.
- 언어는 `ja-JP`로 고정한다.
- 명령어 판정은 정규화 후 키워드 포함 매칭으로 처리한다.
- 성공 시 기존 게스트 생성, 로드아웃 이동, 매칭 시작 handler를 재사용한다.
- 미지원, 권한 거부, 실패 상태에는 마이크 없이 시작할 수 있는 경로를 제공한다.
- transcript와 오디오는 서버로 보내거나 저장하지 않는다.

## 포함 범위

- 기본 일본어 명령어와 범용 콘셉트형 명령어 배열.
- `idle`, `listening`, `matched`, `rejected`, `unsupported`, `blocked`, `error` 상태 분리.
- 홈 화면 음성 시작 패널.
- transcript와 matched command 표시.
- 마이크 없이 시작 경로.
- 모델 단위 테스트와 workspace UI 회귀 테스트.

## 제외 범위

- 억양 평가
- 발음 점수화
- 음성 감정 분석
- 외부 유료 STT 연동
- 완전 오프라인 STT 보장
- 전투 중 스킬 발동
- 사용자별 명령어 저장

## 명령어 정책

기본 명령어는 아래 범위로 시작한다.

- `起動して`
- `スタート`
- `始めて`
- `開始`
- `エンジンをかけて`
- `結界展開`
- `術式起動`
- `呪力起動`
- `封印解除`
- `開門`
- `解放`

특정 작품 고유 표현은 기본 세트에서 제외한다. 필요하면 추후 승인된 product policy와 copy review를 거쳐 별도 옵션으로 추가한다.

## 완료 기준

- 사용자가 홈 화면에서 음성 시작 버튼을 누를 수 있다.
- 일본어 인식 결과가 화면에 표시된다.
- 등록 명령어가 transcript에 포함되면 시작 성공으로 처리된다.
- 시작 성공은 현재 플레이어 상태에 맞춰 게스트 생성, 로드아웃 이동, 매칭 시작 중 하나로 연결된다.
- 인식 실패 또는 미지원 상태에서도 마이크 없이 시작할 수 있다.
- 외부 유료 STT를 사용하지 않는다.

## 검증 결과

| 검증 항목 | 상태 | 비고 |
| --- | --- | --- |
| `pnpm --dir FE/app typecheck` | PASS | TypeScript compile check |
| `pnpm --dir FE/app test` | PASS | FE 54 tests |
| `pnpm --dir FE/app build` | PASS | production build |
| `git diff --check` | PASS | whitespace error 없음 |
| provider-neutral scan | PASS | 금지 제공자/서비스명 없음 |
