# v5 선행조건

## 제품 선행조건

- 연습은 매칭 전 필수 단계가 아니다.
- 연습은 서버 전투 판정, 레이팅, 전적에 영향을 주지 않는다.
- 매칭은 저장된 로드아웃을 사용하는 공식 전투 진입 경로다.
- 전투와 결과는 사용자가 직접 탭으로 들어가는 화면이 아니라 서버 이벤트로 진입하는 진행 상태다.
- 내부 사이트의 기본 언어는 한국어다.

## UX 선행조건

- 왼쪽 탭은 사용자가 직접 방문 가능한 목적지에만 사용한다.
- 상태별 primary CTA는 하나만 제공한다.
- 잠긴 버튼은 숨기지 않고 잠긴 이유를 함께 표시한다.
- 큐 대기 중이거나 전투 중일 때 사용자가 다른 화면을 보더라도 현재 진행 상태를 잃지 않게 한다.
- 연습에서 선택한 술식과 매칭에 저장된 로드아웃은 별개로 표시한다.

## 기술 선행조건

- 연습모드는 브라우저 카메라 권한과 `getUserMedia`가 필요하다.
- 매칭은 플레이어 세션, 저장된 로드아웃, WebSocket 연결이 필요하다.
- 현재 매칭 큐와 active battle runtime은 백엔드 프로세스 내부 상태에 의존한다.
- PostgreSQL은 player, history, rating, compact audit 등 영속 데이터의 저장소로 사용한다.
- 프론트와 백엔드의 skill catalog, gesture sequence 계약이 일치해야 한다.

## 현재 구현상 주의점

- 현재 연습모드는 프론트 로컬 진행만 갱신하며 서버 action submit을 하지 않는다.
- 현재 기본 손동작 runtime은 MediaPipe landmark 기반 heuristic 분류기이며, frame signal runtime은 테스트와 명시적 fallback 용도로만 유지된다.
- 현재 전투 제출은 서버가 gesture sequence와 skill rule을 검증하지만, 서버가 카메라 원본을 독립 검증하지는 않는다.
- API 매칭 경로는 혼자 들어온 사용자를 연습 상대와 자동 매칭하지 않는다.
- 운영형 multi-process 매칭은 아직 별도 설계가 필요하다.

## 구현 중단 조건

- 연습 완료를 레이팅이나 전적에 반영하라는 요구가 생기면 별도 제품 결정을 먼저 한다.
- MediaPipe heuristic을 별도 classifier로 고도화하려면 token 기준, threshold, 검증 샘플을 먼저 확정한다.
- 서버가 손동작 관찰 자체를 검증해야 한다면 raw frame 전송 없이 어떤 normalized observation을 신뢰할지 별도 계약을 만든다.
- 운영형 매칭 확장이 필요하면 queue/session store와 timeout worker 설계를 먼저 확정한다.
