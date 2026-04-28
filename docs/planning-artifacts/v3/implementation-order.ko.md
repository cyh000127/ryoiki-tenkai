# v3 구현 순서

v3는 blocked domain/runtime 구현을 해제하지 않고, 현재 구현을 검증과 인수인계가 쉬운 형태로 묶습니다.

## Phase 0: Scope Guard

1. v2 readiness의 blocked 항목을 확인합니다.
2. concrete frame recognizer runtime이나 skill/resource를 임의 구현하지 않습니다.
3. 새 dependency를 추가하기 전에 technology-stack 문서에 선택 근거를 남깁니다.
4. provider-neutral scan을 유지합니다.

## Phase 1: Planning Baseline

1. v3 epics/stories/implementation-order/prerequisites/technology-stack 문서를 작성합니다.
2. README에 v3 planning docs를 연결합니다.
3. v3의 planned/done/blocked 상태를 분리합니다.

## Phase 2: Handoff Verification Automation

1. `scripts/v3-handoff-check.ps1`을 작성합니다.
2. fast/full/plan-only mode를 제공합니다.
3. FE, BE, compose, boundary, provider-neutral scan을 한 흐름으로 묶습니다.

## Phase 3: Runtime Health and Diagnostics

1. backend health schema에 safe runtime summary를 추가합니다.
2. database URL, credential, raw recognition data는 노출하지 않습니다.
3. backend unit test와 contract test를 업데이트합니다.

## Phase 4: Release Evidence

1. v3 smoke checklist를 작성합니다.
2. v3 release readiness를 작성합니다.
3. README와 v1/v2 readiness에 v3 링크를 추가합니다.
4. 전체 검증을 실행하고 결과를 readiness에 기록합니다.

## 권장 커밋 단위

1. v3 planning baseline.
2. v3 handoff verification script.
3. runtime health summary.
4. v3 smoke checklist and readiness.
5. v3 final README/handoff update.
