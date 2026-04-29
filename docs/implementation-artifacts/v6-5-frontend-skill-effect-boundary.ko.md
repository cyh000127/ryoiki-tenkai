# v6-5 Frontend Skill Effect Boundary 구현 기록

기준 시점: `2026-04-29`

## 판단

실제 Unity WebGL 산출물은 Unity Editor와 정식 Unity 프로젝트가 있어야 만들 수 있다. 이 선행조건이 막힌 상태에서 계속 제품 구현을 진행하려면, Unity가 없어도 유지되어야 하는 프론트 이펙트 정책을 먼저 분리하는 것이 맞다.

## 구현

- `FE/app/src/features/skill-effects/model/skillEffectManifest.ts`
  - 스킬별 `effectId`, tone, replay policy, Unity 지원 여부를 별도 manifest로 분리했다.
  - Gojo 3종은 `supportsUnity: true`, `sustain-after-complete`로 고정했다.
  - Sukuna/Megumi 계열은 실제 Unity asset 전까지 `supportsUnity: false`, `fallback-static`으로 고정했다.

- HTML fallback renderer
  - `skillEffectManifest`를 사용해 fallback 화면에서도 스킬별 effect cue와 effect id를 표시한다.
  - Unity가 실패하거나 asset이 없는 상태에서도 어떤 이펙트 정책이 적용됐는지 확인할 수 있다.

- 테스트
  - `skillEffectManifest.test.ts`를 추가했다.
  - presentation manifest의 `impactVfxId`와 effect manifest의 `effectId`가 어긋나지 않도록 검증한다.
  - fallback renderer가 완료 상태에서 effect id를 보여주는지 검증한다.

## 다음 의미 있는 작업

Unity 산출물이 준비되기 전까지는 아래 순서가 현실적이다.

1. 스킬 효과 manifest를 기준으로 practice UI의 스킬 상세 정보를 더 풍부하게 만든다.
2. Gojo 3종 외 fallback 스킬의 HTML fallback cue를 개선한다.
3. 실제 Unity 프로젝트가 준비되면 `effectId`를 Unity prefab/timeline key에 그대로 연결한다.

## 검증

```powershell
pnpm --dir FE/app test -- skillEffectManifest skillPresentationManifest AnimsetRendererSurface
pnpm --dir FE/app typecheck
git diff --check
```
