# 고라니 투자비서 (gorani-assistant-app)

고라니파이낸스 웹앱의 핵심 화면 구조를 모바일에서 검증하기 위한 **Expo React Native UI 프로토타입**입니다.
현재 앱은 **더미 데이터 기반**이며, Firebase/Auth/실계산/실알림은 연결하지 않습니다.

---

## 1) 앱 목적

- 고라니파이낸스의 정보 구조를 모바일 UX로 검증
- 탭 기반 내비게이션, 캘린더/자산/시뮬레이터/계산기 화면 구성 확인
- 실제 백엔드 연동 전에 UI/상호작용을 빠르게 반복

---

## 2) 실행 방법

```bash
npm install
npm run start
```

추가 실행:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

---

## 3) 폴더 구조

```text
app/
  _layout.tsx
  +not-found.tsx
  (tabs)/
    _layout.tsx
    index.tsx         # 홈
    calendar.tsx      # 캘린더
    asset.tsx         # 자산
    simulator.tsx     # 시뮬레이터
    calculator.tsx    # 계산기
    settings.tsx      # 설정(탭 비노출)
    watchlist.tsx     # 리다이렉트
    dividend.tsx      # 리다이렉트
    checklist.tsx     # 리다이렉트
components/           # 공통 UI 컴포넌트
constants/            # 컬러/상수
hooks/                # 공통 훅
assets/images/        # 아이콘/이미지
data/dummyData.ts     # 더미 데이터 단일 소스
```

---

## 4) 현재 미구현 기능 (의도된 범위)

- Firebase Realtime Database 연결
- Google 로그인 (Firebase Auth)
- 실제 계산 로직(매도전환/양도세치기/시뮬레이터)
- 실제 알림(expo-notifications 예약/권한)
- 실시간 시세 API 연동

---

## 5) Firebase 연결 시 주의사항

- 이번 레포는 Firestore가 아닌 RTDB 기준으로 연결해야 함.
- `tracker`, `tracker_config`, `sim_config`는 초기 단계에서 쓰기 금지 권장.
- `favorite_links`, `dividend_calendar` 내부의 `memos`/`marks`/`custom_ce`는 추후 단계에서 점진 연결.
- 초기 목표는 읽기 안정화 → 최소 쓰기 → 기능 확장 순서.

---

## 6) 기존 고라니파이낸스 RTDB 사용자 키 규칙

기존 운영 레포(`cococute88/gorani-finance`)의 관찰 규칙:

- 기본 규칙(대부분 경로):

```ts
safe_uid = email.replace("@", "_").replace(".", "_")
```

- 예외(`favorite_links`):

```ts
email.replace(".", "_")
```

- Firebase Auth UID를 DB 경로 키로 직접 사용하지 않음

Firebase 연결 시 위 규칙을 그대로 맞춰야 기존 데이터 호환성을 유지할 수 있습니다.

---

## 7) Codex 구현 권장 순서 (다음 단계)

1. 읽기 전용 RTDB 어댑터 작성 (`data/dummyData.ts` 대체 레이어)
2. 캘린더/자산/시뮬레이터/계산기 화면에 읽기 데이터 바인딩
3. 설정 화면에 Google 로그인 UI 액션 연결(Auth만)
4. `favorite_links` 등 저위험 영역부터 최소 쓰기 도입
5. 계산 로직 엔진 분리(로컬 유틸 또는 백엔드 API)
6. 알림 권한/예약 연결(`expo-notifications`)

---

## 8) 탭 구성

하단 탭 5개:

1. 홈
2. 캘린더
3. 자산
4. 시뮬레이터
5. 계산기
