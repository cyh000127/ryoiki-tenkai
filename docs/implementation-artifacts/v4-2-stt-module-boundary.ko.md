# v4-2 STT 모듈 경계 분리 구현 기록

## 목적

일본어 시동 명령에 섞여 있던 브라우저 STT lifecycle을 공용 transcript recognizer port로 분리한다. 이후 흐름은 발음/억양 점수화가 아니라 `STT 명령 인식 -> 손동작 인식 활성화 -> 승인된 스킬 도메인으로 판정`을 목표로 한다.

## 구현 내용

- `FE/app/src/shared/speech/browserSpeechRecognition.ts`를 추가했다.
- 브라우저 speech recognition constructor 조회, 시작/중지, transcript 추출, 권한 거부/error 상태 매핑을 공용 모듈로 옮겼다.
- `startupVoiceCommand`는 `ja-JP` 명령어 정규화와 키워드 매칭에만 집중하도록 정리했다.
- 공용 STT 모듈 단위 테스트를 추가했다.

## 유지한 경계

- STT는 trigger phrase 인식까지만 담당한다.
- 발음 점수, 억양 점수, 감정 분석은 구현하지 않는다.
- 손동작 sequence와 스킬 효과 판정은 approved skill domain source가 준비된 뒤 구현한다.
- transcript와 오디오는 서버로 전송하거나 저장하지 않는다.

## 검증 결과

| 검증 항목 | 상태 | 비고 |
| --- | --- | --- |
| `pnpm --dir FE/app typecheck` | PASS | TypeScript compile check |
| `pnpm --dir FE/app test` | PASS | FE unit regression |
| `pnpm --dir FE/app build` | PASS | production build |
| `git diff --check` | PASS | whitespace error 없음 |
| provider-neutral scan | PASS | 금지 제공자/서비스명 없음 |
