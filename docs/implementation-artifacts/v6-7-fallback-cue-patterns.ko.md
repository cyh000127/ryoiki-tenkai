# v6-7 Fallback Cue Pattern 구현 기록

기준 시점: `2026-05-11`

## 목적

실제 Unity WebGL 산출물이 없는 동안에도 연습장에서 fallback-only 술식이 빈 화면처럼 보이지 않게 한다. 특히 Sukuna/Megumi 계열은 Unity asset이 붙기 전까지 HTML fallback을 유지해야 하므로, 스킬별 발동 cue가 서로 구분되어야 한다.

## 구현

- `skillEffectManifest`에 `cuePattern`을 추가했다.
- Gojo 계열은 Unity 연결 기준을 유지하면서 fallback에서도 구분되도록 `burst`, `collision`, `domain` pattern을 지정했다.
- Sukuna 계열은 `slash` pattern으로 참격 계열 연출을 표시한다.
- Megumi 계열은 `shadow` pattern으로 그림자 계열 연출을 표시한다.
- unknown/custom skill은 `pulse` pattern으로 처리한다.
- HTML fallback renderer가 `cuePattern`을 기준으로 보조 시각 레이어를 만든다.
- CSS에서 pattern별 mark 배치와 색상을 분리해 스킬별 silhouette이 달라지도록 했다.

## 정책

- 이 구현은 실제 Unity prefab을 대체하지 않는다.
- `effectId`는 그대로 Unity prefab/timeline key 후보로 유지한다.
- `cuePattern`은 Unity 산출물 대기 중 연습장 확인용이자, 추후 Unity 이펙트 방향을 설명하는 보조 메타데이터다.

## 검증

```powershell
pnpm --dir FE/app test -- AnimsetRendererSurface skillEffectManifest
pnpm --dir FE/app build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\v6-practice-smoke-check.ps1 -Mode fast
```
