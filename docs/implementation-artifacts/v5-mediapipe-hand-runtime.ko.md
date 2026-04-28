# v5 MediaPipe 손동작 런타임 연결 기록

## 목적

기존 브라우저 카메라 입력은 frame signal 기반 임시 recognizer를 기본값으로 사용했다. 이 방식은 실제 손모양 landmark를 판정하지 않고 화면 신호가 안정되면 현재 기대 token을 반환할 수 있어, 연습모드에서 사용자가 의도하지 않아도 단계가 진행되는 문제가 있었다.

v5에서는 기본 손동작 런타임을 MediaPipe Hand Landmarker 기반으로 교체한다.

## 구현 결정

- 프론트 런타임 의존성으로 `@mediapipe/tasks-vision`을 사용한다.
- `FilesetResolver.forVisionTasks`와 `HandLandmarker.createFromOptions`로 Web Hand Landmarker를 초기화한다.
- `detectForVideo` 결과의 21개 손 landmark를 내부 gesture token으로 변환한다.
- 기본 recognizer는 MediaPipe 런타임을 사용한다.
- 기존 frame signal recognizer는 테스트와 명시적 대체 runtime으로만 유지한다.

## 토큰 매핑 기준

| 내부 token | 판정 기준 |
| --- | --- |
| `index_up` | 검지 펴짐, 중지/약지/소지 접힘 |
| `pinch` | 엄지 끝과 검지 끝 거리 근접 |
| `blue_orb` | 완전한 손바닥 펴짐은 아니고, 손가락 일부가 굽은 구체 쥐기 형태 |
| `red_orb` | 네 손가락이 모두 펴진 손바닥 형태 |
| `orb_collision` | 두 손의 palm center가 가까운 형태 |
| `two_finger_cross` | 검지와 중지 중심의 두 손가락 형태 또는 두 손 seal 근접 |
| `flat_prayer` | 두 손이 가까운 합장/기도 형태 |
| `domain_seal` | 두 손 seal 근접 또는 두 손가락 seal 형태 |
| `shadow_seal` | 접힌 손가락이 많거나 낮은 위치의 봉인 형태 |

## 유지한 안전장치

- landmark가 없으면 `no_hand`를 반환한다.
- token이 한 번 잡혀도 바로 성공시키지 않고 안정 시간 이후 `recognized`로 전환한다.
- 연습모드는 `recognized` 상태가 안정 시간 기준을 넘기면 현재 단계를 자동으로 다음 단계로 진행한다.
- 서버에는 원시 카메라 프레임이나 landmark를 저장하지 않는다.

## 남은 한계

- 현재 토큰 매핑은 규칙 기반 heuristic이다.
- 작품별 복잡한 손모양은 추가 landmark 기준 또는 별도 classifier가 필요하다.
- 추후 손모양 source가 확정되면 token별 threshold를 조정해야 한다.

## 검증

- MediaPipe runtime 단위 테스트
- landmark-to-token classifier 단위 테스트
- live recognizer lifecycle 회귀 테스트
- frontend typecheck/test/build
