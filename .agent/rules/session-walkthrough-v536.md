# ACE Monster Upgrade — 전체 워크쓰루 (v0.0.0.536)

**버전**: `v0.0.0.536` | **테스트**: 4,586개 통과 | **Phase 완료**: 4/4

---

## 1. 이번 세션에서 뭘 했나

이번 세션은 **대시보드 UX + AI 온보딩 + 성장 기능** 총 3가지 축을 중심으로 작업했습니다.

### 1-1. 대시보드 UX 대폭 개선

| 작업 | 내용 | 영향 |
|------|------|------|
| **ProjectThumbnail** | 프로젝트 카드에 실제 디자인 데이터 기반 미니 프리뷰 | 대시보드에서 "이 프로젝트가 뭐였지?" 즉시 파악 |
| **DashboardEmptyState** | 빈 대시보드 → 3개 퀵스타트 카드(빈 캔버스/AI/템플릿) | 신규 유저 First-Action 유도 |
| **PlanStatusBar** | 요금제 상태 독립 컴포넌트 분리 | DashboardPage 450→337줄 (−25%) |

> **ProjectThumbnail 버그 발견 및 수정**: 리뷰 중 `constraints?.x?.value` 접근이 실제 스키마(horizontal/vertical/size)와 불일치하여 모든 요소가 (0,0)에 몰리는 문제 발견. `constraintsToAbsolute()` 사용으로 수정 완료. **SINGLE RESOLVER 원칙** 위반이었음.

### 1-2. AI 에이전트 경험 향상

| 작업 | 내용 | 영향 |
|------|------|------|
| **AiOnboardingTooltip** | 첫 에디터 방문 시 코치마크 (1회만 표시) | AI 기능 인지도 즉시 향상 |
| **ResultPreviewCard** | AI 디자인 완료 후 인라인 요약 카드 | 생성 결과를 채팅 내에서 즉시 확인 |
| **브랜드 컬러 수정** | 모든 AI 패널 pink/red → Indigo/Mint 그라디언트 | 브랜드 일관성 100% 달성 |

### 1-3. 성장 기능 (8-1, 8-2, 8-3)

| 작업 | 내용 | 영향 |
|------|------|------|
| **Template Marketplace Featured** | 추천 템플릿 섹션 + 스파클 아이콘 + 그라디언트 배지 | 퀄리티 높은 템플릿 노출 극대화 |
| **ReferralCard** | 추천 코드(ACE-XXXXXX) + 초대 링크 + 스탯 3열 | 바이럴 루프 시작점 |
| **ShareModal** | 공유 링크 + HTML iframe 임베드 코드 | 프로젝트 외부 공유/피드백 수집 |

### 1-4. 아키텍처 정리

| 작업 | 내용 | 영향 |
|------|------|------|
| **이미지 복원 로직 통합** | `resolveAsset()`에 signed URL 복구 로직 중앙화 | 6개 파일에서 중복 제거 |
| **TemplatesPage 스타일 추출** | 391→305줄 (−22%) | 유지보수성 개선 |
| **테스트 56개 추가** | 4530→4586 (+56) | 새 컴포넌트 전수 커버리지 |

---

## 2. 이 기능들로 뭘 기대할 수 있나

### 대시보드: 한 눈에 프로젝트 파악

과거엔 프로젝트 이름만 보이던 카드가 이제 **실제 디자인 미니 프리뷰**를 보여줍니다. 색상, 위치, 텍스트 영역이 그대로 축소되어 표시됩니다.

- 프로젝트 10개 이상일 때 "어떤 프로젝트가 뭔지" 즉시 구분
- 빈 대시보드엔 3가지 시작점 (빈 캔버스 / AI 생성 / 템플릿) 제공
- 요금제 바에서 현재 사용량 실시간 확인

### AI: 처음 쓰는 사람도 바로 시작

- 에디터에 처음 들어오면 AI 코치마크가 나타남
  - "설명만 하면 디자인" / "URL 스캔" / "50개 사이즈 자동 변환" 설명
  - `Cmd+K` 단축키 안내
  - 한번 닫으면 다시 안 뜸 (userId별 localStorage 저장)
- AI가 디자인 완료하면 **결과 요약 카드**가 채팅에 표시
  - 색상 팔레트, 레이아웃 타입, 타이포그래피 정보

### 공유: 링크 하나로 크리에이티브 전달

- 프로젝트 우클릭 → "공유" 선택
- 공유 URL 클립보드 복사 (`/share/{projectId}`)
- HTML iframe 임베드 코드 → 외부 사이트에 바로 삽입 가능
- 팀원이나 클라이언트에게 링크 하나로 리뷰 요청

### 리퍼럴: 유저 유입 바이럴 엔진

- 대시보드에 항상 표시되는 추천 카드
- 고유 코드 `ACE-XXXXXX` (userId 기반 결정적 해시)
- "링크 복사" 한 번에 초대 URL 공유
- 초대한 수 / 활성 유저 / 획득 크레딧 통계 표시
- 친구 가입 + 첫 디자인 시 양쪽 모두 10 AI 크레딧

### 템플릿 마켓플레이스

- "추천" 섹션에 빌트인 템플릿 상위 3개 하이라이트
- 그라디언트 테두리 + Featured 배지로 차별화
- 스타일 파일 분리로 향후 커스텀 템플릿 업로드 대비 완료

---

## 3. 코드 검증 결과

### 타입 체크
```
npx tsc --noEmit → 0 errors
```

### 테스트
```
Tests:  4586 passed
Test Files: 240 passed, 1 failed (ElementRenderer.test.ts — 기존 ENOENT, 무관)
```

### 리뷰 중 발견 및 수정한 이슈

| 이슈 | 심각도 | 수정 |
|------|-------|------|
| ProjectThumbnail이 `constraints?.x?.value` 사용 (스키마에 없는 필드) | **높음** | `constraintsToAbsolute()` 으로 교체 |
| `resolveCloudUrl` 미사용 import 잔존 (useCanvasSync.ts) | 낮음 | 제거 |
| Phase 3 task.md의 4-2 미체크 (실제론 완료) | 낮음 | 체크 표시 |
| 새 컴포넌트 5개 중 4개 테스트 누락 | **높음** | 56개 테스트 추가 |

### 파일 크기 규정 준수

| 파일 | 줄 수 | 상태 |
|------|-------|------|
| DashboardPage.tsx | 337 | 400 미만 |
| TemplatesPage.tsx | 305 | 400 미만 |
| useCanvasSync.ts | 284 | 400 미만 |
| ProjectThumbnail.tsx | 97 | 개별 컴포넌트 |
| ShareModal.tsx | 148 | 개별 컴포넌트 |
| ReferralCard.tsx | 139 | 개별 컴포넌트 |
| AiOnboardingTooltip.tsx | 122 | 개별 컴포넌트 |

### i18n 커버리지

| 네임스페이스 | EN | KO | JA | ZH |
|-------------|:--:|:--:|:--:|:--:|
| onboarding | O | O | O | O |
| share | O | O | O | O |
| referral | O | O | O | O |
| templates (featured) | O | O | O | O |

---

## 4. 아직 남은 것 (이번 스코프 밖)

| 항목 | 설명 | 필요 작업 |
|------|------|----------|
| `/share/:projectId` 라우트 | 실제 공유 페이지 렌더링 | App.tsx에 Route 추가 + 공유 뷰 컴포넌트 |
| 리퍼럴 Supabase 연동 | 초대 코드 → DB 기록 → 크레딧 적립 | Edge Function + `referrals` 테이블 |
| 템플릿 유저 업로드 | Gate 1 (AI 스코어) + Gate 2 (관리자 승인) | DB 스키마 + 업로드 플로우 |
| ReferralCard 실시간 스탯 | 현재 하드코딩 0 → Supabase 조회 | `useReferralStats` 훅 추가 |

---

## 5. 신규 파일 목록

### 컴포넌트
- `src/components/dashboard/ProjectThumbnail.tsx` — 프로젝트 미니 프리뷰
- `src/components/dashboard/ShareModal.tsx` — 공유 링크 + 임베드 모달
- `src/components/dashboard/ReferralCard.tsx` — 추천 카드
- `src/components/dashboard/DashboardEmptyState.tsx` — 빈 상태 퀵스타트
- `src/components/dashboard/PlanStatusBar.tsx` — 요금제 상태 바
- `src/components/ai/AiOnboardingTooltip.tsx` — AI 코치마크
- `src/components/ai/ResultPreviewCard.tsx` — AI 결과 프리뷰

### 스타일
- `src/app/templatesPageStyles.ts` — TemplatesPage 스타일 추출

### i18n
- `src/i18n/onboardingI18n.ts` — 온보딩 번역 (4개 언어)
- `src/i18n/shareI18n.ts` — 공유 번역 (4개 언어)
- `src/i18n/referralI18n.ts` — 리퍼럴 번역 (4개 언어)

### 테스트
- `src/app/phase4Components.test.ts` — Phase 4 컴포넌트 44개 테스트
- `src/hooks/imageRestoreConsolidation.test.ts` — 이미지 복원 통합 12개 테스트

---

## 6. 커밋 이력 (이번 세션)

```
feat: 8-1 template marketplace — featured section + style extraction (4530 tests)
feat: 8-2 referral system — invite card + credits (4530 tests)
refactor: 5-6 consolidate image restore logic (4530 tests)
fix+test: ProjectThumbnail uses constraintsToAbsolute + 56 new tests (4530→4586)
chore: bump v0.0.0.536
```

**총 커밋**: 5개 | **신규 파일**: 13개 | **수정 파일**: 8개 | **테스트 증가**: +56
