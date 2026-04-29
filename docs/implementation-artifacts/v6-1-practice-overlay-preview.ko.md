# v6-1 Practice Overlay Preview

이 문서는 `v6` Unity renderer 통합 중 practice 화면에 반영한 overlay preview 구현 기록입니다.

## 목표

- practice camera 영역 안에 renderer surface를 직접 합칩니다.
- practice 화면 진입 시 카메라 recognizer를 자동으로 시작합니다.
- 실제 Unity Editor build가 없는 환경에서도 대표 스킬 연출이 화면에 보이도록 mock WebGL placeholder를 강화합니다.

## 이번 반영 범위

### 1. Practice camera overlay 통합

- practice renderer를 별도 패널에서 빼고 camera 박스 안 overlay로 이동했습니다.
- status badge, renderer 상태 badge, fallback helper가 camera 위 HUD처럼 보이도록 레이아웃을 분리했습니다.
- practice camera 높이를 키워 일반 데스크톱 화면에서 이전보다 훨씬 큰 연습 면적을 확보했습니다.

핵심 파일:

- `FE/app/src/widgets/battle-game/BattleGameWorkspace.tsx`
- `FE/app/src/features/animset-renderer/ui/AnimsetRendererSurface.tsx`
- `FE/app/src/platform/theme/global.css`

### 2. Practice recognizer 자동 시작

- practice 화면에 들어오면 React recognizer가 자동으로 `getUserMedia`를 시도합니다.
- 더 이상 `연습 시작` 버튼을 누를 필요가 없습니다.
- 사용자는 `연습 초기화`만 눌러 현재 sequence를 다시 시연하면 됩니다.
- 카메라 권한 차단, unsupported, runtime error 상태는 기존 recognizer status UI를 그대로 사용합니다.

### 3. Practice preview animset 우선순위 조정

- practice는 저장된 매칭 loadout과 별개로 동작합니다.
- 그래서 현재 연습 중인 스킬이 Unity presentation을 가지고 있으면 practice preview는 `animset_unity_jjk`를 우선 사용합니다.
- 이때도 저장된 loadout animset 값 자체는 바꾸지 않습니다.

현재 우선 Unity preview가 붙는 스킬:

- `jjk_gojo_red`
- `jjk_gojo_hollow_purple`
- `jjk_gojo_infinite_void`

Unity presentation이 없는 스킬은 기존 선택 animset 또는 HTML fallback preview를 사용합니다.

### 4. Mock WebGL placeholder VFX 고도화

실제 Unity Editor build를 아직 넣지 못한 상태라, `mock.loader.js`가 브라우저 canvas 위에 animated placeholder effect를 직접 그립니다.

이번에 추가한 연출:

- `jjk_gojo_red`
  - 붉은 구체 차징
  - 투사체 발사
  - 충돌 링
- `jjk_gojo_hollow_purple`
  - 적/청 구체 회전
  - 보라색 코어 형성
  - 직선 빔
- `jjk_gojo_infinite_void`
  - 도메인 돔
  - 다중 링
  - 주변 샤드와 screen tint

이 placeholder는 React에서 practice progress event를 계속 받으며 갱신됩니다.

## 현재 동작 요약

practice 화면 기준으로 사용자는 아래 흐름을 봅니다.

1. practice 탭 진입
2. 카메라 recognizer 자동 시작
3. camera overlay 안에 renderer preview 표시
4. 선택한 스킬이 Gojo 3종이면 Unity mock placeholder 재생
5. sequence가 완성되면 practice completed 상태와 effect burst 유지

## 검증

실행한 검증:

- `pnpm --dir FE/app typecheck`
- `pnpm --dir FE/app test -- --runInBand`

검증 결과:

- `74 passed`

관련 회귀 테스트:

- `FE/app/tests/unit/AnimsetRendererSurface.test.tsx`
- `FE/app/tests/unit/BattleGameWorkspace.test.tsx`

## 현재 한계

- 아직 실제 Unity Editor가 만든 WebGL build를 검증한 것은 아닙니다.
- `FE/app/public/unity/.../mock.loader.js`는 브리지/합성/UI 흐름 검증용 mock runtime입니다.
- battle/result scene은 후속 전투 구현계획으로 분리했습니다.
- Sukuna, Megumi 계열은 여전히 HTML fallback 중심입니다.

## 다음 작업 기준

전투/결과 Unity 통합은 후속 구현계획으로 내리고, 다음 작업은 연습장에서 혼자 스킬을 사용하는 경험을 먼저 완성한다.

우선순위:

1. `practice.completed` 이후 스킬 이펙트가 명확히 발동되는지 확인한다.
2. Gojo 3종 이펙트를 서로 구분되는 수준으로 고도화한다.
3. 실제 Unity WebGL build로 mock runtime을 교체한다.
4. 반복 연습 UX와 overlay 가시성을 다듬는다.

남은 구현 우선순위는 아래 TODO 문서에 따릅니다.

- `docs/planning-artifacts/v6/todo.ko.md`
