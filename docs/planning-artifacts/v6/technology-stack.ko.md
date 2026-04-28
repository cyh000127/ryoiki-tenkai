# v6 기술스택 결정

이 문서는 기존 웹 플레이 앱에 Unity를 `연출 엔진`으로 붙일 때의 기술 선택을 기록한다. 목표는 새 게임 클라이언트를 만드는 것이 아니라, 현재 React/FastAPI 구조 위에 Unity renderer를 얹는 것이다.

## 선택

| 영역 | 결정 | 이유 |
| --- | --- | --- |
| Unity 타깃 | Unity WebGL | 현재 제품이 웹 앱이므로 가장 얇은 통합 경로다. |
| 웹 통합 방식 | official Unity WebGL loader + 얇은 React adapter | 특정 wrapper 종속을 줄이고 renderer port 뒤로 숨기기 쉽다. |
| gameplay authority | FastAPI + React state 유지 | 전투 판정, 매칭, reconnect, camera recognizer를 그대로 재사용할 수 있다. |
| renderer 경계 | `animset renderer port` | Unity와 HTML fallback을 같은 인터페이스로 다루기 쉽다. |
| 통신 형식 | JSON event envelope | skill/battle/practice 상태를 버전 가능한 구조로 넘길 수 있다. |
| practice 입력 | 브라우저 MediaPipe recognizer 유지 | Unity가 카메라 권한과 인식 모델을 직접 소유하지 않게 한다. |
| presentation 데이터 | versioned manifest (`skillId`, `animsetId` 기반) | 새 스킬 추가를 코드 분기보다 데이터 추가 중심으로 만든다. |
| fallback renderer | 기존 HTML/CSS 2D UI 유지 | Unity 로드 실패 시에도 플레이 흐름을 보존한다. |
| preview 자산 | `poster + webm + mp4` | GIF보다 가볍고 제품 UI에 맞는 제어가 쉽다. |
| GIF 용도 | 문서/PR 공유 전용 | 제품 runtime source로 쓰지 않는다. |

## 유지할 경계

- Unity는 스킬이 성공했는지 실패했는지 판정하지 않는다.
- Unity는 HP, mana, cooldown, turn owner를 계산하지 않는다.
- Unity는 WebSocket에 직접 연결하지 않는다.
- Unity는 플레이어 프로필, 로드아웃, 전적을 저장하지 않는다.
- React는 Unity event를 보내더라도 gameplay state의 source of truth를 유지한다.

## 제안 디렉터리 구조

- `FE/app/src/features/animset-renderer/model/rendererPort.ts`
- `FE/app/src/features/animset-renderer/adapters/unityWebglRenderer.ts`
- `FE/app/src/features/animset-renderer/adapters/htmlFallbackRenderer.ts`
- `FE/app/src/features/skill-presentation/model/skillPresentationManifest.ts`
- `FE/app/public/unity/<build-version>/...`

## 제외

- 네이티브 Unity 클라이언트
- Unity가 직접 큐 진입/취소를 처리하는 구조
- Unity가 손동작 인식 모델을 직접 구동하는 구조
- GIF 기반 스킬 연출
- 모든 스킬의 1차 풀 3D 제작
