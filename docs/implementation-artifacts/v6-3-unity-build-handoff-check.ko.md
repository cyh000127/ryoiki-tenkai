# v6-3 Unity Build Handoff Check 구현 기록

기준 시점: `2026-04-29`

## 목적

실제 Unity WebGL 산출물이 준비됐을 때 `build.json` 교체만으로 끝내지 않고, 누락된 파일과 버전 불일치를 먼저 잡을 수 있게 한다.

## 추가한 것

- `scripts/unity-build-check.ps1`
  - `build.json` 존재 여부 확인
  - `productVersion`과 React registry의 기대 버전 확인
  - `loaderUrl`, `bridgeTarget`, `bridgeMethod` 확인
  - 참조된 loader 파일이 실제로 존재하고 config directory 밖으로 벗어나지 않는지 확인
  - `-RequireUnityBuild` 사용 시 `mock.loader.js`를 거부하고 `dataUrl`, `frameworkUrl`, `codeUrl`까지 필수 확인

- `.gitignore`
  - 루트의 일반 `build/` ignore 정책은 유지한다.
  - 단, `FE/app/public/unity/**/Build/**`는 실제 WebGL 산출물 교체가 가능하도록 예외로 둔다.

- `README.md`
  - 기본 검증 명령에 Unity build check를 추가했다.

## 사용법

현재 placeholder 상태 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\unity-build-check.ps1
```

실제 Unity 산출물 교체 후 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\unity-build-check.ps1 -RequireUnityBuild
```

계획만 확인:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\unity-build-check.ps1 -PlanOnly
```

## 실제 Unity 산출물 교체 기준

실제 Unity Editor WebGL build가 준비되면 아래 파일들이 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/Build` 아래에 있어야 한다.

- `*.loader.js`
- `*.data` 또는 Unity build 설정에 맞는 data 파일
- `*.framework.js`
- `*.wasm`

그 다음 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/build.json`의 값을 실제 파일명에 맞춘다.

## 현재 한계

현재 저장소에는 실제 Unity Editor build 산출물이 없다. 따라서 `-RequireUnityBuild`는 지금 실패하는 것이 정상이다. 이 스크립트는 placeholder를 실제 build로 교체하는 시점의 인수 검증용이다.
