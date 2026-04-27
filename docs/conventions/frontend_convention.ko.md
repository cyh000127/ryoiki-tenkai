# 프론트엔드 코드 컨벤션

## 원칙

- 프론트엔드 앱은 `FE/app` 아래에 둡니다.
- 라우트 기반 화면을 가진 단일 페이지 앱 구조를 사용합니다.
- FSD 의존 방향 `pages -> widgets -> features -> entities -> shared`를 따릅니다.
- 기술 기반은 `platform`, 생성 계약 산출물은 `generated`에 둡니다.
- 서버 상태는 query adapter에 둡니다. 서버 상태를 전역 UI store로 복사하지 않습니다.
- 라우트 안에서만 쓰는 상호작용 상태는 로컬에 둡니다.
- API 호출은 생성 클라이언트 경계 또는 platform adapter를 통합니다.
- 화면 코드는 원시 네트워크 API를 직접 호출하지 않습니다.
- 사용자에게 보이는 문자열은 로케일 카탈로그에 둡니다.
- 접근성, 키보드 조작, 로딩, 빈 상태, 오류, 차단 상태를 1급 요구사항으로 취급합니다.

## 패키지 레이아웃

```text
FE/
  app/
    src/
      generated/
        api-client/
      platform/
        api/
        auth/
        i18n/
        theme/
        ui/
      pages/
      widgets/
      features/
      entities/
      shared/
```

## 레이어 규칙

- `pages`: 라우트 진입점과 화면 조합.
- `widgets`: 화면 수준 블록.
- `features`: 사용자 액션, 워크플로, 명령, mutation.
- `entities`: 도메인 읽기 모델, mapper, schema, formatter.
- `shared`: 도메인 의미가 없는 재사용 헬퍼.
- `platform`: API 런타임, 인증 경계, 로케일, UI wrapper, theme, app shell.
- `generated`: 생성 산출물만 둡니다. 생성 결과를 수동 편집하지 않습니다.

## API 규칙

- 백엔드 wire 계약은 `BE/api/contracts` 아래에 둡니다.
- 생성된 프론트엔드 산출물은 `FE/app/src/generated/api-client` 아래에 둡니다.
- 렌더링 전에 전송 모델을 화면 안전 모델로 매핑합니다.
- page나 widget 파일에서 백엔드 계약을 다시 정의하지 않습니다.

## 상태 규칙

- 서버 데이터는 query adapter를 사용합니다.
- 짧은 화면 상태는 로컬 상태를 사용합니다.
- 전역 UI store는 라우트를 넘나드는 워크플로 상태에만 사용합니다.
- cooldown, confidence, hand-tracking session 상태는 feature 레이어 이하에 둡니다.
