# ACE Upgrade Roadmap: Absorbing 4 Competitors' Best Features

> **전략**: OpenPencil의 도구 체계 + Penpot의 에이전트 교육 패턴 + PosterMaker의 레이아웃 지능 + Jaaz의 모델 라우팅 → ACE만의 자율 배너 공장

---

## Phase 1: AI Context Revolution (2 weeks)

**목표**: AI를 "2-tool blind agent" → "40+-tool context-aware agent"로 업그레이드

### What We Absorb

| From | Feature | ACE Implementation |
|---|---|---|
| **OpenPencil** | 90-tool taxonomy (12 categories) | 7 tool 파일 → 40+ atomic tools |
| **OpenPencil** | Scene Graph Query | `sceneGraphBuilder.ts` — 계층 구조 JSON |
| **OpenPencil** | Design Token Analysis | `designTokenAnalyzer.ts` — 색상/타이포/간격 분석 |
| **PenAI** | SVG Preprocessing for LLM | `llmContextBuilder.ts` — 요소→자연어 설명 변환 |

### New Files

```
src/services/tools/
  ├── readTools.ts       ← getPageTree, getNode, findNodes, getSelection
  ├── createTools.ts     ← createShape, createText, createImage, createGroup
  ├── modifyTools.ts     ← setFill, setFont, moveNode, resizeNode, setConstraints
  ├── structureTools.ts  ← deleteNode, renameNode, groupNodes, reparentNode
  ├── analyzeTools.ts    ← analyzeColors, analyzeTypography, analyzeSpacing
  ├── sizingTools.ts     ← addVariant, propagateToAll, smartResize (ACE 고유!)
  └── exportTools.ts     ← exportPNG, exportHTML5, exportAllVariants (ACE 고유!)

src/services/
  ├── toolRegistry.ts         ← 전체 tool 통합 registry + schema 자동 생성
  ├── sceneGraphBuilder.ts    ← designStore → AI용 계층 구조 JSON
  └── designTokenAnalyzer.ts  ← 색상/타이포/간격 일관성 분석
```

### Modified Files
- `autoDesignService.ts` — 2 tools → toolRegistry 연결

---

## Phase 2: Multi-Agent Chain (3 weeks)

**목표**: 단일 LLM 호출 → Planner → Executor → Critic 파이프라인

### What We Absorb

| From | Feature | ACE Implementation |
|---|---|---|
| **Penpot** | 3-Agent: Plan→Execute→Verify | `plannerAgent.ts` + `executorAgent.ts` + `criticAgent.ts` |
| **PenAI** | Constraint-Guided Generation | `designPlan.types.ts` — 제약 조건 기반 생성 계획 |
| **PenAI** | LLM Comprehension Preprocessing | `llmContextBuilder.ts` — JSON→자연어 변환 |

### Agent Flow
```
User: "Make a Black Friday banner for Nike"
  ↓
[PLANNER] — brand kit 분석, 레퍼런스 참조, 레이아웃 전략 결정
  ↓ design_plan.json
[EXECUTOR] — 40+ tools 호출하여 배너 생성
  ↓ completed banner
[CRITIC] — Vision API 스크린샷 분석, 겹침/클리핑/브랜드 준수 체크
  ↓ "PASS" or fix_patches[]
  ↓ (fail → EXECUTOR 재실행 → CRITIC 재검증 → 루프)
```

### New Files
```
src/services/agents/
  ├── plannerAgent.ts    ← 브랜드 킷 + 레퍼런스 분석 → design_plan.json
  ├── executorAgent.ts   ← design_plan 따라 tool 호출
  └── criticAgent.ts     ← Vision API로 결과 검증

src/services/
  └── llmContextBuilder.ts  ← JSON 요소 → LLM 이해용 자연어

src/schema/
  └── designPlan.types.ts   ← DesignPlan 타입 정의
```

### Modified Files
- `autoDesignLoop.ts` — 단일 호출 → 3-agent 체인으로 리팩토링

---

## Phase 3: Design Intelligence + Model Router (4 weeks)

**목표**: 업종별 레이아웃 지능 + 모델 자동 선택

### What We Absorb

| From | Feature | ACE Implementation |
|---|---|---|
| **PosterMaker** | SceneGenNet 레이아웃 규칙 | `layoutIntelligence.ts` — 업종별 배치 규칙 |
| **Jaaz** | 10+ Model Router | `modelRouter.ts` + `openRouterClient.ts` |
| **PenAI** | Semantic Auto-Naming | `useAutoDesign.ts` — 레이어 자동 이름 지정 |

### Model Selection Strategy
```
design-planning  → Claude Sonnet 4 (구조적 사고)
tool-execution   → Claude Sonnet 4 (tool calling)
vision-qa        → GPT-4o (스크린샷 분석)
image-gen        → Midjourney / Flux (이미지 생성)
text-rewrite     → Claude Haiku (빠른 카피 변형)
```

### New Files
```
src/engine/
  └── layoutIntelligence.ts  ← 업종/캠페인별 배치 규칙

src/services/
  ├── modelRouter.ts         ← 용도별 최적 모델 자동 선택
  └── openRouterClient.ts    ← OpenRouter API (50+ LLM)
```

---

## Dependency Order (중요!)

```
Phase 1-1 (Tool Registry) ──→ Phase 1-2 (Scene Graph) ──→ Phase 2 (Agent Chain)
                          └──→ Phase 1-3 (Token Analyzer) ──→ Phase 2
Phase 2 ──→ Phase 3 (Layout Intelligence + Model Router)
```

**한마디**: Phase 1 Tool Registry가 **foundation**. 여기 없으면 Phase 2 에이전트가 호출할 tool이 없음.

---

## Total Impact

| Metric | Before | After All Phases |
|---|---|---|
| AI Tools | 2 | **40+** |
| AI Context | 평면 요소 리스트 | 계층 그래프 + 토큰 분석 + 자연어 설명 |
| AI Architecture | 단일 LLM 호출 | 3-Agent 체인 + 자동 교정 루프 |
| Model Support | Claude only | **Claude + GPT-4o + Midjourney + Flux** |
| Layout Intelligence | 5 카테고리 비율 분류 | + 업종별 배치 규칙 |
| Test Coverage | 151 tests | **200+ tests** |
