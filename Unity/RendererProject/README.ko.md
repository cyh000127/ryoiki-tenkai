# Unity Renderer Project Scaffold

이 폴더는 `React -> Unity WebGL renderer` 통합을 위해 미리 준비한 source scaffold 입니다.

중요:

- 이 저장소에는 아직 Unity Editor가 생성한 정식 `.meta`, `ProjectSettings`, scene asset이 포함되어 있지 않습니다.
- 대신 브리지 스크립트와 timeline routing 스크립트를 먼저 넣어 두었습니다.
- 실제 Unity 프로젝트를 만들 때는 이 폴더를 기준으로 새 WebGL 프로젝트를 생성하거나, 새 프로젝트에 이 스크립트들을 복사하면 됩니다.
- `RendererRuntimeBootstrap`이 빈 씬에서도 `CodexBridge`, `RendererSceneState`, `SkillTimelineRouter`, `ProceduralSkillVfxPlayer`를 자동으로 올립니다.
- 현재 웹 프론트는 practice camera 안에 renderer overlay를 붙인 상태이며, Unity 자산이 없는 환경에서는 `FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/Build/mock.loader.js`의 mock WebGL runtime으로 placeholder 연출을 보여줍니다.

## 권장 시작 순서

1. Unity Hub에서 새 3D 또는 URP 프로젝트를 만든다.
2. 생성된 프로젝트 안의 `Assets/Scripts`에 이 폴더의 스크립트를 복사한다.
3. 빈 scene 그대로 실행해도 되지만, 수동 배치를 원하면 `CodexBridge` GameObject 하나만 만들어도 된다.
4. WebGL build target을 선택한다.
5. 빌드 산출물을 아래 경로에 맞춰 내보낸다.

권장 빌드 경로:

- `/Users/hyeok127/Desktop/project/ryoiki-tenkai/FE/app/public/unity/ryoiki-tenkai-renderer/prototype-v1/Build`

## 현재 프론트 브리지 계약

React는 아래 target/method로 Unity에 JSON 이벤트를 보냅니다.

- GameObject: `CodexBridge`
- Method: `ReceiveEvent`

Unity 쪽은 이 문자열 payload를 받아:

- 현재 scene 전환
- `skillId -> timelineId` 선택
- practice progress 반영
- battle snapshot 반영
- result highlight 반영
- practice overlay preview 재생

만 처리하면 됩니다.

`RendererSceneState`는 위 payload를 inspector 친화적인 상태 값으로 펼쳐 두는 용도입니다.
실제 연출 구현은 `SkillTimelineRouter`와 `ProceduralSkillVfxPlayer`가 이어서 맡습니다.

## 지금 바로 구현할 것

- hero skill 3개 timeline 연결
- practice scene skeleton
- battle scene skeleton
- result scene skeleton
- 코드 기반 placeholder VFX 3종

## 현재 웹앱 연결 상태

- practice 화면 renderer는 별도 패널이 아니라 camera 영역 안 overlay로 mount 됩니다.
- practice 화면에 들어오면 React recognizer가 자동으로 시작됩니다.
- 선택한 practice 스킬에 Unity presentation이 있으면, 저장된 loadout animset과 별개로 practice preview는 `animset_unity_jjk`를 우선 사용합니다.
- 현재 mock WebGL runtime은 진짜 Unity build 대신 animated placeholder를 그립니다.

## 현재 포함된 placeholder VFX

- `jjk_gojo_red`
  - 붉은 구체 차징
  - 짧은 투사체 발사
  - 충돌 링과 버스트
- `jjk_gojo_hollow_purple`
  - 적/청 구체 회전 차징
  - 보라색 코어 형성
  - 직선 빔과 충격파
- `jjk_gojo_infinite_void`
  - 도메인 돔 확장
  - 다중 링 전개
  - 카메라 틴트와 부유 샤드

이 연출들은 전부 `Unity 기본 primitive`, `LineRenderer`, `ParticleSystem`, `Camera`만으로 생성됩니다.
즉 지금은 외부 모델, prefab, timeline asset이 없어도 React 브리지와 실제 재생 흐름을 검증할 수 있습니다.

현재 프론트에서 바로 보이는 placeholder preview는 아래 3종입니다.

- `jjk_gojo_red`
- `jjk_gojo_hollow_purple`
- `jjk_gojo_infinite_void`

## 다음에 실제 자산을 붙일 때

1. `SkillTimelineRouter`의 `playableKey`를 유지한다.
2. `ProceduralSkillVfxPlayer`의 스킬별 분기 대신 prefab/timeline 재생기로 교체한다.
3. `timelineId`, `clipId`, `cameraPresetId`, `impactVfxId`는 그대로 manifest 기준으로 유지한다.

## 나중에 붙일 것

- 실제 캐릭터 애니메이션
- 고급 VFX
- camera preset tuning
- 나머지 스킬 timeline
- mock WebGL runtime을 실제 Unity WebGL build 산출물로 교체
- battle/result scene의 실제 Unity smoke 검증

## 남은 TODO 문서

- `/Users/hyeok127/Desktop/project/ryoiki-tenkai/docs/planning-artifacts/v6/todo.ko.md`

## 자산 manifest 샘플

- `Assets/StreamingAssets/skill-presentation-manifest.sample.json`

이 파일은 direct skill authoring 때 필요한 최소 메타데이터 구조 예시입니다.
실제 Unity timeline/clip/VFX 키를 정하면 이 구조를 기준으로 runtime 또는 editor tooling에 연결하면 됩니다.
