# v6-4 Practice Smoke Checklist 구현 기록

기준 시점: `2026-04-29`

## 목적

v6는 전투보다 연습장에서 혼자 술식을 쓰는 경험이 우선이다. 이 문서는 Unity renderer, 손동작 인식, fallback 정책이 연습 흐름을 깨지 않는지 반복 확인하는 smoke 기준을 고정한다.

## 자동 확인 명령

빠른 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode fast
```

전체 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode full
```

계획만 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -PlanOnly
```

## fast mode 범위

- Unity build config 확인
- frontend typecheck
- practice renderer 관련 단위 테스트
- git diff whitespace check

fast mode는 실제 카메라 권한과 production build까지 보장하지 않는다. 코드 변경 후 빠르게 practice renderer 경계를 확인하는 용도다.

## full mode 범위

- fast mode 전체
- frontend production build
- live camera smoke fixture

full mode는 브라우저 자동화와 카메라 권한 fixture까지 확인한다. 로컬 브라우저/Playwright 환경이 준비되어 있어야 한다.

## 수동 smoke 기준

자동 테스트만으로 실제 카메라와 화면 가시성을 완전히 대체할 수 없다. UI 변경 또는 Unity 산출물 교체 후에는 아래를 직접 확인한다.

1. `docker compose up --build` 또는 개발 서버로 앱을 실행한다.
2. `http://localhost:5173`에 접속한다.
3. 게스트 시작 후 연습 화면으로 이동한다.
4. 카메라 권한을 허용한다.
5. 손 mesh가 초록색 연결선으로 보이는지 확인한다.
6. Gojo 3종 중 하나를 선택한다.
7. 안내된 손동작 sequence를 완료한다.
8. `술식 발동 완료` 상태와 이펙트가 동시에 보이는지 확인한다.
9. `연습 초기화` 후 같은 스킬을 다시 반복한다.
10. Sukuna/Megumi 계열은 HTML fallback으로 빈 화면 없이 연습 진행이 가능한지 확인한다.

## 성능 예산

현재 실제 Unity Editor WebGL build가 없으므로 수치는 placeholder 기준이다. 실제 Unity 산출물 교체 후 아래 기준을 다시 측정한다.

- 초기 renderer mount: 연습 화면 진입 후 2초 이내에 fallback 또는 Unity renderer 상태가 보여야 한다.
- 손동작 인식: renderer가 올라와도 camera recognizer 상태가 멈추면 안 된다.
- 이펙트 발동: sequence 완료 후 1초 이내에 완료 상태와 이펙트가 보여야 한다.
- 반복 연습: 초기화 후 같은 스킬을 다시 완료할 수 있어야 한다.
- fallback: Unity load 실패, version mismatch, missing asset 상황에서 연습 UI가 유지되어야 한다.

## 현재 한계

- 실제 Unity WebGL build 산출물이 없어 `-RequireUnityBuild` 검증과 실제 VFX 성능 측정은 아직 막혀 있다.
- 전투/결과 Unity 연출은 후속 구현계획이다.
- 신규 스킬 추가 시 손동작 token과 Unity asset authoring은 별도 승인 후 진행한다.

## 검증 결과

아래 명령을 현재 placeholder build 기준으로 통과했다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -PlanOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode fast
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode full
```

`full` mode 결과:

- Unity build config check: PASS
- frontend typecheck: PASS
- practice renderer unit tests: PASS, 6 files / 44 tests
- frontend production build: PASS
- live camera smoke fixture: PASS, 2 tests
