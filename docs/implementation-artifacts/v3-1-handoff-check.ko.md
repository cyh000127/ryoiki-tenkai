# v3-1 handoff 검증 스크립트 구현 기록

이 문서는 `V3-E1-ST01`의 구현 기록입니다. V3 handoff 검증을 반복 실행할 수 있도록 단일 PowerShell entrypoint를 추가했습니다.

## 구현 내용

- `scripts/v3-handoff-check.ps1`
  - `-Mode fast`는 frontend typecheck/test, backend lint/test, boundary check, compose config, git diff check, provider-neutral scan을 실행합니다.
  - `-Mode full`은 fast 검증에 camera smoke와 frontend build를 추가합니다.
  - `-PlanOnly`는 실행할 command 목록만 출력합니다.
  - 각 단계의 이름과 command를 출력하고, 실패 exit code를 명확히 전달합니다.

## 범위 제외

- 새 package나 외부 검증 서비스를 추가하지 않았습니다.
- concrete frame recognizer runtime 또는 skill/resource 구현을 시작하지 않았습니다.
- raw recognition data 수집 또는 backend 전송을 추가하지 않았습니다.

## 검증

- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -PlanOnly`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v3-handoff-check.ps1 -Mode fast`
- `git diff --check`
- provider-neutral targeted text scan

## 다음 단계

1. README와 v3 smoke checklist에 handoff command를 연결합니다.
2. backend health summary를 추가해 runtime diagnostics 범위를 완성합니다.
