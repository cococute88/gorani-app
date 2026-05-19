# 고라니 투자비서 — Expo React Native UI 프로토타입

고라니파이낸스 Streamlit 웹앱의 정보 구조를 모바일 UI에 맞게 재현한 Expo React Native 프로토타입입니다.
Firebase 연결 없이 더미 데이터만으로 동작하는 읽기 전용 UI입니다.

> 실제 계산 로직, Firebase, Google 로그인, 주가 API, 알림 기능은 구현되어 있지 않습니다.

---

## 하단 탭 구조

| 순서 | 탭명 | 파일 | 설명 |
|---|---|---|---|
| 1 | 홈 | `app/(tabs)/index.tsx` | 요약 대시보드, 임박 일정, 빠른 이동 |
| 2 | 캘린더 | `app/(tabs)/calendar.tsx` | 월간 이벤트 캘린더 + 이벤트 상세 |
| 3 | 자산 | `app/(tabs)/asset.tsx` | 월별 집계 자산 트래커 |
| 4 | 시뮬레이터 | `app/(tabs)/simulator.tsx` | 자산 시뮬레이터 결과 요약 |
| 5 | 계산기 | `app/(tabs)/calculator.tsx` | 매도전환계산기 + 양도세치기 배당시뮬 |

**설정 화면** (`app/(tabs)/settings.tsx`)은 홈 우측 상단 톱니바퀴 버튼에서 접근합니다.
기존 `watchlist`, `dividend`, `checklist` 화면은 각각 캘린더/계산기로 리다이렉트됩니다.

---

## 각 화면 목적

### 1. 홈 (`index.tsx`)
- KPI 카드 4개: 이번 달 일정 수 / 등록 티커 수 / 총자산(더미) / 최종 실질잔고(더미)
- 임박 배당락 배너 (daysUntil 기반)
- 오늘의 한마디 카드
- 빠른 이동 버튼 4개: 캘린더 / 자산 / 시뮬레이터 / 계산기
- 임박 일정 리스트 (7일 이내, D-Day 표시)
- 최근 메모 2개

### 2. 캘린더 (`calendar.tsx`)
- 이벤트 타입 범례: Ex-Div / Buy / Pay / Earn (컬러 코딩)
- 이전달/다음달/TODAY 네비게이션
- 이벤트 타입 필터 칩 (전체 / Ex-Div / Buy / Pay / Earn)
- **월간 그리드: 날짜 셀 안에 이벤트 라벨 직접 표시** (점만 찍는 방식 아님)
  - 셀 안에 최대 2개 라벨 (예: "APAM Ex", "SGOV Pay")
  - 초과 시 "+N" 표시
- 선택된 날짜 상세 카드 (portfolio/ticker/타입/배당금/수익률/메모)
- 전체 일정 리스트 테이블

### 3. 자산 (`asset.tsx`)
- 월 선택 칩 (26-01 ~ 26-05 등)
- 선택 월 총자산 카드
- 전월 대비 증감 카드 (컬러 코딩)
- 자산군별 비중 리스트 (현금 / 달러 / SGOV채권성 / 나스닥 / SPY / 배당주 / 기타)
  - 비중 바 시각화 + 금액 + 퍼센트
- 기간별 추이 막대 그래프 (월별 총자산)
- 원문 붙여넣기 Placeholder 카드

### 4. 시뮬레이터 (`simulator.tsx`)
- 입력 설정 요약 카드 (startYear / simYears / returnRate 등 10개 항목)
- 핵심 KPI 카드 6개:
  - 최종 명목 잔고 / 최종 실질 잔고 / 합산 명목 / 합산 실질 / 은퇴년도 / 연금저축 한도
- 5개 탭 버튼 선택:
  1. **잔고 추이**: 명목 vs 실질 라인 차트
  2. **배당금 추이**: 연도별 총 월 수익 막대 차트
  3. **적립 현황**: 연도별 기초잔고/적립/배당/기말잔고 테이블
  4. **절세계좌 인출**: 연도별 ISA/연금 인출 테이블
  5. **배당 위탁잔고**: 위탁 잔고 vs 연간 배당금 라인 차트

### 5. 계산기 (`calculator.tsx`)
제목: **고라니 계산기**

**A. 매도전환계산기**
- 입력 요약: 매도 티커 / 매수 티커 / 시작일 / 종료일
- 결과 KPI: 시작가 / 현재 전환비 / 평균 전환비 / 평균 대비 차이
- 전환비 추이 라인 차트 (시계열)
- 상세 날짜별 테이블

**B. 양도세치기 배당시뮬**
- 입력 요약: 티커 / 투자자금 / 매수 기준 / 배당소득세율
- KPI 6개: 승률 / 성공평균수익률 / 실패평균손실률 / 손익비 / 기대수익률 / 1회 절세예상액
- 수익률 분포 산점도 (성공/실패 컬러 코딩)
- 배당락일별 상세 테이블

---

## 더미 데이터 위치

**모든 더미 데이터는 `data/dummyData.ts` 단일 파일에 집중 관리합니다.**

---

## 데이터 구조 상세

### calendarEvents (캘린더 이벤트)
```typescript
interface CalendarEvent {
  id: string;
  portfolioName: string;
  ticker: string;
  eventType: "Ex-Div" | "Buy" | "Pay" | "Earn";
  date: string;           // "YYYY-MM-DD"
  shortLabel: string;     // 셀 안 표시용 짧은 텍스트
  dividendAmount?: number;
  currentPrice?: number;
  annualYield?: number;
  memo?: string;
  star?: boolean;
  heart?: boolean;
  customSymbol?: string;
  customTitle?: string;
}
```

이벤트 타입 색상:
- `Ex-Div`: `#E07B6A` (빨간계열)
- `Buy`: `#C9A96E` (골드)
- `Pay`: `#6AAB82` (초록)
- `Earn`: `#8B6F47` (브라운)

### assetMonthlyData (자산 트래커)
```typescript
interface AssetMonthly {
  month: string;           // "2026-01"
  displayLabel: string;    // "26-01"
  totalAsset: number;      // KRW
  changeFromPrev: number;
  tags: AssetTag[];
  memo?: string;
}
interface AssetTag {
  name: string;            // "현금", "달러", "SGOV/채권성" 등
  amount: number;
  ratio: number;           // 0-100
  category: "cash" | "bond" | "stock" | "dividend" | "other";
}
```

### simulatorConfig (시뮬레이터 설정)
```typescript
{
  startYear: number;
  simYears: number;
  returnRate: number;       // % 단위
  inflationRate: number;
  initIsa: number;          // KRW
  initPension: number;
  initGeneral: number;
  initDividend: number;
  withdrawRate: number;
  withdrawIncrease: number;
  withdrawDelay: number;    // 시작연도 기준 경과년수
}
```

### simulatorResults (시뮬레이터 결과)
```typescript
{
  kpis: {
    finalNominalBalance: number;
    finalRealBalance: number;
    combinedNominalBalance: number;
    combinedRealBalance: number;
    retirementYear: number;
    pensionLimit: number;
  };
  balanceTrend:     { year, nominal, real }[];
  dividendTrend:    { year, pensionMonthly, brokerageMonthly, total }[];
  planData:         { year, startBalance, contribution, dividendIncome, endBalance }[];
  withdrawalTable:  { year, isaWithdrawal, pensionWithdrawal, totalWithdrawal }[];
  dividendAccountTable: { year, balance, dividendMonthly }[];
}
```

### calculatorData (계산기)
```typescript
{
  conversionAnalysis: {
    inputs: { sellTicker, buyTicker, startDate, endDate };
    kpis:   { sellTickerStart, buyTickerStart, currentRatio, avgRatio, diffFromAvg };
    ratioTrend:  { date, sellPrice, buyPrice, ratio }[];
    tableRows:   { date, sellPrice, buyPrice, ratio }[];
  };
  dividendTaxSim: {
    inputs: { ticker, investmentAmount, buyBasis, holdingDays, taxRate, last5YearsOnly };
    kpis:   { winRate, avgWinReturn, avgLossReturn, profitLossRatio, expectedReturn, taxSavingPerTrade };
    scatterData: { id, x, y, success, label }[];
    tableRows:   { date, buyPrice, dividendNet, breakeven, success, returnRate, recoveryDate }[];
  };
}
```

### homeSummary / notesData / settingsData
- `homeSummary`: 시장 상태, 오늘의 한마디, 임박 이벤트, KPI 집계값
- `notesData`: 최근 메모 리스트 `{ id, title, content, updatedAt }`
- `settingsData`: 프로필, 알림 설정, 앱 버전 등

---

## Firebase 연결 시 교체할 파일

| 파일 | 교체 내용 |
|---|---|
| `data/dummyData.ts` | Firestore 실시간 쿼리 함수로 전면 교체 (최우선) |
| `app/(tabs)/settings.tsx` | `handleGoogleLogin`, `handleLogout` 함수 구현 |
| `app/(tabs)/calendar.tsx` | `calendarEvents` import → Firestore 구독 |
| `app/(tabs)/asset.tsx` | `assetMonthlyData` import → Firestore 쿼리 |
| `app/(tabs)/simulator.tsx` | `simulatorConfig/Results` → Firestore 문서 읽기 |
| `app/(tabs)/calculator.tsx` | `calculatorData` → Firestore 또는 Cloud Function |

---

## 로컬 알림 연결 시 수정할 파일

- `app/(tabs)/calendar.tsx` — 이벤트 저장 시 알림 예약 로직 추가
- `app/(tabs)/settings.tsx` — 알림 토글 onValueChange에 권한 요청 연결
- `expo-notifications` 패키지 활성화 및 권한 요청 필요

---

## Codex가 건드리면 안 되는 디자인 컴포넌트

아래 파일들은 디자인 토큰 및 공통 UI 컴포넌트입니다. 기능 추가 시 직접 수정하지 마세요.

- `constants/colors.ts` — 크림/브라운/골드 컬러 팔레트
- `hooks/useColors.ts` — 색상 훅
- `components/Card.tsx`
- `components/Badge.tsx`
- `components/SummaryCard.tsx`
- `components/SectionHeader.tsx`
- `components/NoteCard.tsx`
- `components/ToggleRow.tsx`
- `components/QuickActionCard.tsx`
- `components/CalendarGrid.tsx` — 이벤트 라벨 셀 내 표시
- `components/CalendarEventCard.tsx`
- `components/KPICard.tsx`
- `components/MiniBarChart.tsx` — 막대 그래프 (View 기반)
- `components/MiniLineChart.tsx` — 라인 차트 (View 기반)
- `components/ScatterPlot.tsx` — 산점도 (View 기반)

---

## 현재 구현 상태 (프로토타입 명시)

이 앱은 **UI 프로토타입**입니다. 아래 기능은 현재 구현되어 있지 않습니다:

- ❌ Firebase / Firestore 연결
- ❌ Google 로그인 (UI 버튼만 존재)
- ❌ 실제 주가 데이터 API 호출
- ❌ 실제 양도세 / 배당세 계산 로직
- ❌ 실제 알림 예약 (expo-notifications)
- ❌ 자산 텍스트 파싱 로직
- ❌ 시뮬레이터 실제 계산 엔진

모든 수치와 그래프는 `data/dummyData.ts`의 더미 데이터입니다.

---

## 실행 방법

```bash
# 의존성 설치
pnpm install

# Expo 개발 서버 시작
pnpm --filter @workspace/gorani-assistant run dev

# QR 코드를 Expo Go로 스캔하거나 웹 브라우저 미리보기
```

---

## 남은 TODO (Codex 작업 대상)

- [ ] Firebase Firestore 연결 (`data/dummyData.ts` 교체)
- [ ] Firebase Auth + Google 로그인 (`settings.tsx`)
- [ ] expo-notifications 로컬 알림 예약
- [ ] 자산 원문 텍스트 파싱 로직 (자산 화면 Placeholder)
- [ ] 시뮬레이터 계산 엔진 연동 (Cloud Function 또는 Python 백엔드)
- [ ] AsyncStorage 기반 오프라인 캐시
- [ ] EAS Build 설정 (APK/AAB 빌드)
- [ ] 캘린더 이벤트 직접 추가/편집 UI (현재 읽기 전용)
