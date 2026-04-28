# v4-3 캐릭터/스킬/STT 참고자료 정리 기록

## 입력

- 참고자료: `docs/product/jujutsu-technique-domain-reference.ko.md`
- 요청: STT와 스킬 제작을 위한 캐릭터, 스킬 정리. 내부 손모양은 추후 구현 계획으로 분리.

## 판단

참고 파일은 주술회전의 고유 캐릭터, 고유 기술명, 고유 발동 문구를 포함합니다. 사용자가 Phase 1을 주술회전으로 시작한다고 승인했으므로, 해당 고유명을 별도 카탈로그에 저장했습니다. 동시에 추후 확장용 오리지널 후보도 분리했습니다.

## 산출물

- 주술회전 한국어 카탈로그: `docs/product/jujutsu-character-skill-stt-catalog.ko.md`
- 주술회전 영어 카탈로그: `docs/product/jujutsu-character-skill-stt-catalog.en.md`
- 오리지널 확장 한국어 카탈로그: `docs/product/character-skill-stt-catalog.ko.md`
- 오리지널 확장 영어 카탈로그: `docs/product/character-skill-stt-catalog.en.md`

## 정리한 범위

- 주술회전 캐릭터/술식 후보
- 주술회전 일반 스킬 후보
- 주술회전 영역전개 후보
- MVP 추천 시작 세트
- 오리지널 확장 후보
- STT 매칭 정책
- 손모양 구현 계획
- 다음 결정 필요 항목

## 제외한 범위

- 내부 손모양 구현
- 실제 스킬 수치 확정
- backend fixture/API contract 변경

## 다음 단계

1. MVP 캐릭터 수를 2명 또는 3명으로 제한합니다.
2. 캐릭터별 일반 스킬 수와 궁극기 포함 여부를 확정합니다.
3. STT trigger 후보를 확정합니다.
4. 손모양 token source가 준비되면 gesture sequence와 backend skill catalog를 연결합니다.
