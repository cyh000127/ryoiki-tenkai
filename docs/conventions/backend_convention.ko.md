# 백엔드 코드 컨벤션

## 원칙

- 백엔드 코드는 도메인과 유스케이스 기준으로 구성합니다.
- 기본 흐름은 `Router -> Service -> Repository`를 따릅니다.
- Router는 HTTP 입출력, 의존성 연결, 응답 DTO 처리만 담당합니다.
- Service는 비즈니스 흐름, 검증, 트랜잭션 경계, 명령 결정을 담당합니다.
- Repository는 영속성 접근만 담당합니다.
- 요청 DTO와 응답 DTO는 ORM 모델과 분리합니다.
- API 페이로드는 `camelCase`, Python 코드는 `snake_case`를 사용합니다.
- `BE/api`는 집계 상태의 표준 쓰기 소유자입니다.
- `BE/worker`는 작업이나 이벤트를 처리할 수 있지만 API 소유 쓰기 규칙을 우회하지 않습니다.
- 상태 변경은 범용 setter 대신 명시적 메서드를 사용합니다.
- 오류 처리는 중앙화합니다.

## 패키지 레이아웃

```text
BE/
  api/
    src/
      gesture_api/
        api/
          routes/
          schemas/
          exception_handlers.py
        services/
        repositories/
        models/
        domain/
        db/
          unit_of_work.py
  core/
    src/
      gesture_core/
  worker/
    src/
      gesture_worker/
```

## 레이어 규칙

- `api/routes`: 라우트 정의와 의존성 호출만 둡니다.
- `api/schemas`: 요청과 응답 DTO를 둡니다.
- `services`: 동사형 메서드를 가진 유스케이스 서비스를 둡니다.
- `repositories`: ORM 영속성 접근과 읽기 저장소를 둡니다.
- `models`: 영속성 모델만 둡니다.
- `domain`: enum, 도메인 규칙, 값 객체, 도메인 예외를 둡니다.
- `db`: 세션, base, 트랜잭션 헬퍼를 둡니다.

## DTO 규칙

- 타입 모델이 적절한 경계에서는 원시 dictionary를 넘기지 않습니다.
- 라우트에서 ORM 모델을 직접 노출하지 않습니다.
- 요청 DTO 이름은 `CreateGestureCommandRequest`처럼 명령을 설명합니다.
- 응답 DTO 이름은 `GestureCommandResponse`처럼 반환 형태를 설명합니다.

## 트랜잭션 규칙

- 한 유스케이스의 쓰기는 하나의 명확한 트랜잭션 경계 안에서 처리합니다.
- Service는 트랜잭션 의도를 알고 있어야 합니다.
- Repository는 트랜잭션을 직접 결정하지 않습니다.
- API 소유 상태는 worker에서 직접 갱신하지 않습니다.
