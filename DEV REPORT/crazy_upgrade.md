# CRAZY UPGRADE — Master Plan

> ACE의 핵심 경쟁력: **AI Agent + Smart Sizing** 을 그 누구도 비교할 수 없는 수준으로

---

## OpenPencil Research Findings

| 기능 | OpenPencil 구현 | ACE 적용 |
|------|---------------|---------|
| **Vision Input** | 유저가 스크린샷/목업 첨부 → AI가 참고해서 디자인 생성 | **Scan Design의 핵심** |
| **AI Self-Verify** | AI가 스스로 프레임 스크린샷 촬영 → 결과 확인 → 자기수정 | **Vision QA Loop** |
| **87 Tools** | 12 카테고리 (Read/Create/Modify/Structure/Analyze/Export/etc) | ACE: ~40 tools in 2 systems (통합 필요) |
| **Yoga WASM** | Auto-layout (flexbox/grid), constraint-based positioning | **Smart Sizing Solver** |
| **Design Tokens** | `analyze_colors/typography/spacing/clusters` → 디자인 일관성 | ACE: analyzeTools.ts 존재 (미연결) |
| **Component Overrides** | 인스턴스별 override, 마스터 동기화 | ACE: sizingOverrideStore (이번 세션 구현) |
| **Design-as-Code** | JSON `.op` 파일 → Git 버전관리 가능 | ACE: JSON CreativeSet 구조 이미 있음 |
| **WebRTC Collab** | P2P, 서버 불필요, 커서/프레즌스 | 향후 (Phase 5+) |

> **OpenPencil의 핵심 인사이트: AI가 "눈"을 가지고 있다.**
> AI가 디자인을 만든 후 스스로 스크린샷을 찍어서 결과를 확인하고 수정한다.
> ACE에는 이 "눈"이 없다. 이것만 추가하면 디자인 퀄리티가 극적으로 올라간다.

---

## Macro Roadmap

### Phase 0: Vision Foundation (기반)

**목표: AI에게 "눈"을 달아준다**

```
Canvas → Screenshot (base64) → Claude Vision API → Structured Analysis JSON
```

| Item | Description | 연결 포인트 |
|------|-------------|-----------|
| **Canvas Capture** | `canvas.toDataURL('image/png')` → base64 | EditorCanvas, BannerPreviewGrid |
| **Vision API Service** | base64 → OpenRouter (Claude Sonnet 4 Vision) → JSON | modelRouter.ts의 `vision` role 활용 |
| **Analysis Schema** | 응답: `{ elements[], layout_type, issues[], quality_score }` | Zod 검증 |

**이게 완성되면:**
- Auto Design이 자기 결과를 확인하고 자동 수정 가능
- Scan Design이 레퍼런스를 분석할 수 있음
- Smart Check가 모든 사이즈를 한눈에 QA 가능

---

### Phase 1: Vision QA Loop (자기검증)

**목표: AI가 만들면 → 스크린샷 → 검증 → 수정 → 재검증**

```
agentPipeline.ts Step 3 (Critic) 확장:
  1. Structural Critic (현재) → 수학적 검증
  2. Visual Critic (NEW) → 스크린샷 → Vision API → 시각적 검증
  3. Score = (structural * 0.4) + (visual * 0.6)
  4. Score < 82? → auto-fix → re-render → re-screenshot → re-check
```

| Trigger Point | Where | When |
|--------------|-------|------|
| AI Chat (Auto Design) | agentPipeline.ts step 3 | 디자인 생성 직후 |
| AI Chat (modify) | agentTools.ts | 디자인 수정 직후 |
| Size Dashboard "Smart Check" | BannerPreviewGrid.tsx | 버튼 클릭 시 |
| Smart Sizing propagation | smartSizing.ts | 마스터→변형 후 |

---

### Phase 2: Scan Design (레퍼런스 카피)

**목표: 레퍼런스 이미지 업로드 → 분석 → ACE 툴로 재현**

```
User uploads reference image
     ↓
Vision API analyzes:
  - Layout structure (header, hero, CTA, footer zones)
  - Color palette (primary, secondary, accent, bg)
  - Typography hierarchy (headline size/weight, body, CTA)
  - Element positions (percentage-based)
  - Visual style (minimal, bold, gradient, photo-bg)
     ↓
AI generates DesignPlan matching reference
     ↓
Pipeline executes with ACE tools:
  - Shapes/gradients → create_shape
  - Text → create_text with matched fonts
  - Images → Flux Schnell/Imagen 3 for similar assets (NEW)
  - Complex graphics → Image Gen API (Flux/NanoBanana2)
     ↓
Vision QA: screenshot ACE result vs reference → similarity score
     ↓
If similarity < 80%: AI adjusts → re-check
```

**AI의 판단 기준:**

| 요소 | ACE 툴로 가능 | Image Gen 필요 |
|------|-------------|---------------|
| 단색 배경 | `create_shape` | - |
| 그라디언트 | `create_shape` gradient | - |
| 텍스트 | `create_text` | - |
| CTA 버튼 | `create_button` | - |
| 기하학적 장식 | `create_shape` 조합 | - |
| 제품 사진 | - | **Flux/Imagen** |
| 복잡한 그래픽/일러스트 | - | **Flux/Imagen** |
| 로고 | Brand Kit에서 가져오기 | - |

---

### Phase 3: Image Generation Service (AI 에셋 생성)

**목표: Flux Schnell + Imagen 3 실제 연결**

```
modelRouter.ts에 이미 설정됨:
  image_fast:    Flux Schnell (black-forest-labs/flux-1-schnell)
  image_quality: Imagen 3     (google/imagen-3)

필요한 것:
  1. imageGenService.ts [NEW] — OpenRouter image API 호출
  2. AI가 "이건 이미지로 생성해야 해" 판단하는 로직
  3. 생성 이미지 → 캔버스에 자동 삽입
```

---

### Phase 4: AI-Driven Smart Sizing (핵심 연결)

**목표: "One prompt → Master → 50 sizes → QA → Done"**

```
Step 1: AI creates master design (agentPipeline)
Step 2: Vision QA on master (Phase 1)
Step 3: Smart Sizing propagates to ALL variants
  → Constraint solver maps element roles to layout rules:
    - role="headline" → stays in top 30%, font scales proportionally
    - role="cta" → anchored to bottom 15%, min touch target 44px
    - role="logo" → stays in corner, max 20% of width
    - role="background" → stretches to fill
Step 4: Vision QA on EACH variant (batch)
  → Detects: text overflow, element clipping, spacing issues
Step 5: Auto-fix problematic variants
  → Reduce font size, reposition elements, adjust spacing
Step 6: User reviews in Size Dashboard (Smart Check button)
```

**Constraint Rules (role-based rule engine):**

```typescript
interface SizingConstraint {
  role: string;           // "headline" | "cta" | "logo" | etc.
  anchor: {
    h: 'left' | 'center' | 'right';
    v: 'top' | 'center' | 'bottom';
  };
  minFontScale: number;   // e.g. 0.6 (never smaller than 60%)
  maxFontScale: number;   // e.g. 1.4
  padding: {
    top: string;           // "10%" | "20px"
    bottom: string;
  };
  aspectRatioRules: {
    ultraWide: { ... };    // w/h > 2.5 (970x250)
    landscape: { ... };    // 1.3 < w/h <= 2.5 (300x250)
    square: { ... };       // 0.7 <= w/h <= 1.3
    portrait: { ... };     // w/h < 0.7 (160x600)
  };
}
```

---

### Phase 5: Design Memory + Learning (지능 고도화)

| Feature | Description |
|---------|-------------|
| **Conversation Persist** | AI 대화를 localStorage → Supabase로 영구 보관 |
| **Design Memory v2** | 생산된 모든 디자인 + 유저 피드백 → 프롬프트 최적화 |
| **Industry Rules** | 업종별 디자인 규칙 (금융=정적/보수, 패션=다이나믹/비주얼) |
| **Style Learning** | 특정 브랜드/유저의 선호 스타일 패턴 학습 |
| **Reference Library** | Scan Design으로 수집한 레퍼런스 → 라이브러리 |

---

## Priority Matrix

| Phase | Impact (AI+Sizing) | Effort | Priority |
|-------|-------------------|--------|----------|
| **0. Vision Foundation** | CRITICAL (모든 것의 기반) | Small | **DO FIRST** |
| **1. Vision QA Loop** | HIGH (디자인 퀄리티 극적 향상) | Medium | **NEXT** |
| **2. Scan Design** | HIGH (유저 핵심 기능) | Medium | **NEXT** |
| **3. Image Gen** | MEDIUM (에셋 생성) | Small | AFTER |
| **4. AI Smart Sizing** | CRITICAL (핵심 차별화) | Large | **PARALLEL with 1-2** |
| **5. Memory + Learning** | MEDIUM (장기 차별화) | Large | LATER |

---

## Phase 0 Micro Implementation (세부 — 바로 시작 가능)

### New Files

| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `src/services/visionService.ts` [NEW] | Canvas capture + Vision API call + response parsing | ~120L |
| `src/services/imageGenService.ts` [NEW] | Flux/Imagen API call + image download | ~80L |
| `src/schema/visionSchema.ts` [NEW] | Zod schema for Vision analysis response | ~40L |

### Modified Files

| File | Change |
|------|--------|
| `agentPipeline.ts` | Add Vision Critic step after Structural Critic |
| `criticAgent.ts` | Import visionService, add visual scoring |
| `BannerPreviewGrid.tsx` | Add "Smart Check" button |
| `modelRouter.ts` | Verify Flux/Imagen API format |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| AI design quality (self-score) | ~75/100 (structural only) | **90+/100 (visual+structural)** |
| Scan Design accuracy | 0% (doesn't exist) | **80%+ similarity to reference** |
| Smart Sizing pass rate | Manual only | **95%+ auto-pass across all sizes** |
| One-prompt-to-50-sizes time | N/A | **< 30 seconds** |
| Design Memory entries | 0 used | **Top 5 used in every generation** |
