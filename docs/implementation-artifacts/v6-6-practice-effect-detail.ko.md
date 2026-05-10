# v6-6 Practice Effect Detail 구현 기록

기준 시점: `2026-05-10`

## 목적

Unity Editor 산출물이 아직 없는 상태에서도 연습장에서 어떤 술식 이펙트 정책이 적용되는지 사용자가 확인할 수 있게 만든다.

이번 구현의 초점은 전투가 아니라 연습장이다. 사용자가 술식을 고르고 손동작을 연습할 때, 해당 술식이 어떤 `effectId`로 연결되는지, Unity 연출 대상인지, 반복 연습에서 어떤 방식으로 유지되는지를 화면과 HTML fallback 양쪽에서 드러내는 것이 목표다.

## 구현

- 연습장 선택 술식 요약에 `effectId`, 렌더러 준비 상태, 반복 연습 정책을 추가했다.
- 술식 상세 패널에도 같은 정보를 표시해 스킬 일본어 이름, 한국어 이름, 설명, 손동작 가이드와 이펙트 정책을 한 화면에서 확인할 수 있게 했다.
- HTML fallback renderer의 meta 영역에 `Effect`, `Policy` 항목을 추가했다.
- HTML fallback의 발동 cue에 `effectId`와 Unity 준비 여부를 aria-label과 보조 텍스트로 표시했다.
- Unity 지원 스킬과 fallback-only 스킬이 CSS data attribute로 구분되도록 했다.

## UX 정책

- Gojo 계열처럼 Unity 연출 대상인 술식은 `Unity 연출 준비`로 표시한다.
- Sukuna/Megumi 계열처럼 실제 Unity asset이 아직 없는 술식은 `HTML 기본 연출`로 표시한다.
- 연습 완료 후 유지되는 스킬은 `발동 후 유지`로 표시한다.
- 기본 fallback만 제공되는 스킬은 `기본 연출 반복`으로 표시한다.

## 검증

```powershell
pnpm --dir FE/app test -- BattleGameWorkspace AnimsetRendererSurface skillEffectManifest
pnpm --dir FE/app typecheck
git diff --check
```

## 다음 작업

Unity 프로젝트가 준비되면 현재 화면에 노출되는 `effectId`를 Unity prefab 또는 timeline key와 그대로 연결한다. 실제 Unity WebGL build 파일이 들어오기 전까지는 HTML fallback이 연습장 검증 기준 역할을 유지한다.
