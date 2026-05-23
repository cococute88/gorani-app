# 고라니 투자비서 (gorani-assistant-app)

고라니파이낸스 웹앱의 핵심 화면 구조를 모바일에서 검증하기 위한 **Expo React Native 앱**입니다. 현재 UI는 더미 데이터 기반이며, 이번 단계에서 **Google 로그인 + Firebase Auth + RTDB 읽기 전용 연결 준비**를 추가했습니다.

---

## 1) 왜 Expo Go가 아니라 Development Build인가?

`@react-native-google-signin/google-signin`은 네이티브 모듈이므로 Expo Go 단독으로는 동작하지 않습니다.  
따라서 Google 로그인 테스트는 **Expo Development Build / EAS Build** 기준으로 진행해야 합니다.

---

## 2) 설치 및 실행

```bash
npm install
cp .env.example .env
npm run typecheck
npx expo prebuild
npx expo run:android
```

> 개인용 Android APK/EAS 빌드 기준으로 사용하세요.

---

## 3) 설치 패키지

- `firebase` (Firebase App/Auth/Realtime Database)
- `@react-native-google-signin/google-signin` (Google 로그인 네이티브 SDK)

Firestore는 사용하지 않습니다.

---

## 4) Firebase/Google 콘솔 사용자 설정 (필수)

1. Firebase 프로젝트에서 Android 앱 등록 확인
   - 패키지명: `com.gorani.finance.assistant`
2. Firebase Authentication > Sign-in method에서 **Google provider 활성화**
3. Android SHA-1 등록
   - 디버그/릴리즈(또는 EAS) 키 SHA-1을 Firebase에 등록해야 로그인 토큰 검증이 정상 동작
4. `google-services.json` 다운로드 후 레포 루트에 배치
   - 경로: `./google-services.json`
   - 절대 GitHub에 커밋하지 마세요
5. `.env` 값 입력
   - Firebase Web 설정값 + RTDB URL
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`는 **확인 필요**
     - Firebase Auth 연동 시 일반적으로 Web Client ID를 사용
     - Android Client ID와 혼동 금지

### Google 로그인 실기기 확인 체크리스트

- Expo Go가 아니라 Android Development Build에서 테스트
- Firebase Android 앱 패키지명 `com.gorani.finance.assistant` 확인
- Firebase Android 앱에 디버그/릴리즈 또는 EAS SHA-1 등록
- Firebase Authentication에서 Google Provider 활성화
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`에는 Android Client ID가 아니라 Web Client ID 입력
- `google-services.json`은 로컬 루트에만 두고 커밋 금지
- `.env`는 로컬에만 두고 커밋 금지

### 로그인 유지 확인 방법

1. APK를 설치합니다.
2. Google 로그인을 완료합니다.
3. 앱을 완전히 종료합니다.
4. 앱을 다시 실행합니다.
5. 설정 화면에서 로그인 상태가 유지되는지 확인합니다.
6. 로그아웃 버튼을 누르면 비로그인 상태로 돌아가는지 확인합니다.

---

## 5) .env 항목

`.env.example`을 복사해서 사용:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (확인 필요)

---

## 6) 고라니파이낸스 userKey 규칙 (기존 웹앱 호환)

앱에서도 Firebase Auth UID를 경로키로 쓰지 않고, **email 기반 userKey**를 사용합니다.

- `safe_uid_at_dot` (대부분 경로)
  - `email.replace(/@/g, "_").replace(/\./g, "_")`
  - 사용 경로: `tracker`, `tracker_config`, `sim_config`, `dividend_calendar`
- `safe_uid_dot_only` (`favorite_links` 전용)
  - `email.replace(/\./g, "_")`

> `replace(".", "_")`는 첫 번째 점만 바뀌므로 사용 금지.

### Auth UID를 경로에 쓰면 안 되는 이유

기존 웹앱 데이터 구조가 email 변환 키 기반이라 UID를 사용하면 기존 데이터와 경로 호환이 깨집니다.

---

## 7) RTDB 읽기 전용 1단계 범위

초기 구현은 읽기 전용입니다.

### 쓰기 금지 경로

- `tracker`
- `tracker_config`
- `sim_config`

### 나중에 쓰기 후보

- `favorite_links`
- `dividend_calendar/memos`
- `dividend_calendar/marks`
- `dividend_calendar/custom_ce`

---

## 8) RTDB Rules 예시 (개인용, 콘솔에서 직접 이메일 수정)

아래는 예시입니다. `YOUR_GOOGLE_EMAIL@gmail.com`은 실제 본인 계정으로 바꿔서 Firebase Console Rules에 적용하세요.

```json
{
  "rules": {
    "users": {
      ".read": "auth != null && auth.token.email == 'YOUR_GOOGLE_EMAIL@gmail.com'",
      "$userKey": {
        "tracker": { ".write": false },
        "tracker_config": { ".write": false },
        "sim_config": { ".write": false },
        "favorite_links": {
          ".write": "auth != null && auth.token.email == 'YOUR_GOOGLE_EMAIL@gmail.com'"
        },
        "dividend_calendar": {
          ".write": "auth != null && auth.token.email == 'YOUR_GOOGLE_EMAIL@gmail.com'"
        }
      }
    }
  }
}
```

---

## 9) 현재 미구현

- RTDB write/update/remove 함수
- 실제 화면 전체 RTDB 바인딩(여전히 dummyData 중심)
- 계산 엔진/알림/시세 API
