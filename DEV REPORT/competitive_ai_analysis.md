# ACE DEV REPORT: AI Integration Deep Analysis

**4 Competitors Dissected: OpenPencil · Jaaz · PosterMaker · Penpot vs ACE**

---

## Executive Summary

ACE가 billion-dollar 제품이 되려면 **AI를 "도구" 수준에서 "지능" 수준으로** 올려야 한다. 경쟁사 4곳의 실제 코드/아키텍처를 해부한 결과, ACE는 현재 AI 통합에서 **근본적으로 뒤처져 있지만**, 이들 누구도 **"자율 배너 생산 파이프라인"** 을 완성하지 못했다. 이 간극이 ACE의 기회.

---

## PART 1: How They Make AI Context-Aware

### 1A. OpenPencil — "90-Tool Scene Graph Protocol"

**핵심 인사이트**: OpenPencil은 AI에게 "화면 스크린샷"이 아닌 **"디자인의 구조적 데이터"** 를 제공한다.

**MCP Tool Taxonomy (90 tools, 12 categories):**

```
Document ─── open_file, save_file, new_document
Read     ─── get_selection, get_page_tree, get_node, find_nodes,
              get_components, list_pages, list_variables, list_fonts,
              page_bounds, node_bounds, node_ancestors, node_children,
              node_tree, node_bindings
Create   ─── create_shape, create_vector, create_slice, create_page,
              render (JSX!), create_component, create_instance, node_to_component
Modify   ─── set_fill, set_stroke, set_effects, update_node, set_layout,
              set_constraints, set_rotation, set_opacity, set_radius,
              set_minmax, set_text, set_font, set_font_range, set_text_resize,
              set_visible, set_blend, set_locked, set_stroke_align,
              set_text_properties, set_layout_child, node_move, node_resize,
              node_replace_with, arrange
Structure ── delete_node, clone_node, rename_node, reparent_node,
              select_nodes, group_nodes, ungroup_node, flatten_nodes,
              boolean_union/subtract/intersect/exclude
Vector   ─── path_get, path_set, path_scale, path_flip, path_move
Export   ─── export_image, export_svg
Viewport ─── viewport_get, viewport_set, viewport_zoom_to_fit
Variables ── get/find/create/set/delete_variable, bind_variable,
              get/create/delete_collection
Analyze  ─── analyze_colors, analyze_typography, analyze_spacing, analyze_clusters
Diff     ─── diff_create, diff_show
Navigation ─ switch_page
Escape   ─── eval (Figma Plugin API — disabled in HTTP mode)
```

**Context-Awareness 메커니즘:**

| Layer | How It Works | ACE에 없는 것 |
|---|---|---|
| **Scene Graph Query** | `get_page_tree` → AI가 전체 디자인 계층 구조를 JSON으로 받음 | ACE는 요소 목록만 전달 (계층 없음) |
| **Node Traversal** | `node_ancestors`, `node_children`, `node_tree` → 특정 요소의 관계 추적 | ACE에 없음 |
| **Spatial Query** | `node_bounds`, `page_bounds` → 요소의 정확한 좌표/크기 | ACE `CanvasElementInfo`는 기본값만 |
| **Design Token Analysis** | `analyze_colors/typography/spacing/clusters` → 디자인 일관성 파악 | ACE에 없음 |
| **Variable System** | `bind_variable`, `get_variable` → 디자인 토큰을 변수로 관리 | ACE에 없음 |
| **Diff System** | `diff_create/show` → 변경 전후 비교 | ACE에 없음 |

**AI Agent Skill System:**
```bash
npx skills add open-pencil/skills@open-pencil
```
→ Claude Code / Cursor / Windsurf에 "OpenPencil을 쓰는 법"을 통째로 주입. CLI + MCP + JSX rendering + eval + 실행 중인 앱 자동화 브릿지 전부를 하나의 skill 패키지로 제공.

**Key Workflow Pattern:**
```
Open → Read (understand) → Create/Modify → Structure → Save
```
→ AI가 먼저 "읽고 이해"한 뒤 행동. 이것이 context-aware의 핵심.

---

### 1B. Penpot/PenAI — "SVG Refactoring for LLM Comprehension"

**핵심 인사이트**: Penpot은 **AI가 이해하기 쉽도록 디자인 데이터 자체를 전처리**한다.

**Context-Awareness 3대 전략:**

**전략 1: SVG 리팩토링 (LLM이 이해할 수 있는 형태로 변환)**
```python
# PenAI의 핵심 — SVG path를 explicit shapes로 리팩토링
# BEFORE (LLM이 이해 못 함):
# <path d="M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"/>
#
# AFTER (LLM이 이해함):
# <rect x="10" y="10" width="80" height="70" fill="#ff0000"/>
# <circle cx="50" cy="50" r="20" fill="#0000ff"/>
```
→ Claude 3.5 Sonnet이 SVG path 데이터를 직접 읽으면 이해도가 낮음. 그래서 PenAI는 **SVG를 "읽기 쉬운 형태"로 전처리**한 뒤 AI에게 전달.

**전략 2: Constraint-Guided Generation**
```python
# variation이 원본 의미를 유지하도록 제약 조건 설정
constraints = {
    "maintain_semantics": True,      # 의미 유지
    "respect_color_palette": True,    # 프로젝트 컬러 팔레트 준수
    "vary_scope": "foreground_only",  # 전경만 변형
    "shape_similarity": 0.8,          # 80% 유사도 유지
}
```

**전략 3: Multi-Agent Architecture (AI Wizard Plugin)**
```
User Request → Planning Agent → Execution Agent → Verification Agent
                    ↓                   ↓                   ↓
            "어떤 도구를 쓸까"   "실제 도구 호출"    "결과 검증"
```
→ 단일 LLM 호출이 아니라 **3단계 에이전트 체인**으로 디자인을 생성. Planning agent가 context를 수집하고, Execution agent가 실행, Verification agent가 품질 검증.

**PenAI Use Cases (실제 구현됨):**

| Use Case | Method | ACE 적용 가능성 |
|---|---|---|
| **Vector Shape Variations** | Claude 3.5에 원본 SVG + 제약조건 전달 → 배리에이션 생성 | 배너 컴포넌트 변형에 즉시 적용 가능 |
| **Style Transfer** | 템플릿 변환(hover/focus/disabled) → 다른 요소에 동일 변환 적용 | 마스터→슬레이브 스타일 전파에 적용 |
| **Semantic Naming** | AI가 레이어 이름을 자동으로 의미 있게 부여 | 레이어 패널 자동 이름 지정 |
| **Hierarchy Inference** | 잘못 그룹핑된 요소를 AI가 올바르게 재구조화 | Smart Sizing 전 자동 레이어 정리 |

---

### 1C. PosterMaker (Alibaba/CVPR 2025) — "Dual-Network Poster Generation"

**핵심 인사이트**: PosterMaker는 **텍스트를 이미지 생성 파이프라인 안에서 정확하게 렌더링**하는 문제를 해결했다.

**Architecture:**
```
Product Image + Text + Positions
       ↓
SceneGenNet (Stage 2) — 배경 + 제품 배치 + 장면 생성
       ↓
TextRenderNet_v2 (Stage 1) — 정확한 텍스트 렌더링 (위치/크기 지정)
       ↓
SD3 (Stable Diffusion 3) — 최종 고품질 이미지 출력
```

**제한사항 (ACE가 이길 수 있는 포인트):**
- 최대 7줄 텍스트, 줄당 16글자
- 좌표를 수동으로 지정해야 함 (`[69, 104, 681, 185]`)
- 출력이 **래스터 이미지** (편집 불가 — 레이어가 없음)
- 중국어 최적화 (영어 텍스트 품질 불확실)

**ACE에 차용할 핵심 아이디어:**

> [!IMPORTANT]
> PosterMaker의 진짜 혁신은 "텍스트를 이미지 안에 정확하게 배치"하는 것. ACE는 이미 레이어 기반이라 텍스트 배치가 자유롭지만, **AI가 "어디에 텍스트를 놓을지"를 결정하는 로직**은 PosterMaker의 SceneGenNet에서 영감을 받을 수 있음.

---

### 1D. Jaaz — "Multi-Model Router + ComfyUI Agent"

**핵심 인사이트**: Jaaz는 **하나의 인터페이스에서 10+ AI 모델을 자유롭게 전환**하는 라우팅 아키텍처.

**AI Model Router Architecture:**
```
User Prompt
    ↓
┌─────────────────────────────┐
│ Model Router (Backend)      │
├─────────────────────────────┤
│ GPT-4o        → Text + Vision understanding       │
│ Midjourney    → High-quality image generation      │
│ VEO3          → Video generation (Google)          │
│ Kling         → Video generation (Chinese)         │
│ Seedance      → Dance/animation generation         │
│ Stable Diff.  → Local image generation (offline)   │
│ Flux          → Fast image generation              │
│ ComfyUI       → Local pipeline (custom workflows)  │
│ Ollama        → Local LLM (offline privacy)        │
└─────────────────────────────┘
```

**Magic Canvas Context-Awareness:**
```
직접 그리기 (스케치) + 화살표로 지시
       ↓
Vision Model (GPT-4o) — 스케치 해석
       ↓
Prompt 자동 최적화 (multi-turn refinement)
       ↓
이미지/비디오 생성
```
→ 사용자가 프롬프트를 쓰지 않아도 **"그리기"만으로 AI가 의도를 파악**. 이건 ACE의 캔버스 위에서도 구현 가능.

---

## PART 2: ACE 현재 상태 vs 경쟁사 비교

### ACE의 AI 통합 현황 (autoDesignService.ts 분석)

```
ACE 현재 AI Tools: 2개
├── render_banner  → 처음부터 배너 생성 (from scratch)
└── rearrange_banner → 기존 요소 재배치 (patches + additions)

Context 전달 방식:
├── CanvasElementInfo[] → 기본 id/name/type/x/y/w/h만 전달
├── Brand config → primaryColor, fontFamily, logoUrl
├── Canvas dimensions → width/height
└── 사용 가능한 폰트 목록
```

### 격차 분석

| Capability | OpenPencil | Penpot | PosterMaker | Jaaz | **ACE** |
|---|---|---|---|---|---|
| AI Tools 수 | **90** | 50+ (plugin) | 1 (inference) | ~20 | **2** |
| MCP Protocol | Yes (stdio+HTTP) | Yes | No | No | **Partial (HTTP only)** |
| Scene Graph Query | Full tree + ancestors | Plugin API | N/A | N/A | **None** |
| Design Token Analysis | colors/typography/spacing/clusters | Python bindings | N/A | N/A | **None** |
| SVG Preprocessing | Figma node → SVG | SVG refactoring for LLM | N/A | N/A | **None** |
| Multi-Agent Chain | No (single call per tool) | Yes (3-agent: plan→exec→verify) | No | No | **No** |
| Vision Feedback | No | Claude 3.5 Vision | SD3 ControlNet | GPT-4o Vision | **GPT-4o (planned)** |
| Style Transfer | constraint-based | Template-based | ControlNet | AI routee | **None** |
| Model Routing | OpenRouter (any LLM) | OpenAI/OpenRouter | SD3 only | **10+ models** | **Claude only** |
| Context Depth | Full scene graph + metadata | SVG + refactored shapes | Image + coords | Sketch + arrows | **Flat element list** |

---

## PART 3: ACE 성공 공식 — "The Autonomous Banner Factory"

### 경쟁사가 할 수 없는 것

```
   ┌─────────────────────────────────────────────────────────────┐
   │ A C E   A U T O N O M O U S   B A N N E R   F A C T O R Y │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  [Brand Kit Upload]                                         │
   │       ↓                                                     │
   │  [AI Design Agent] ← Scene Graph Context (OpenPencil 방식)  │
   │       ↓                                                     │
   │  [Master Banner] ← Style Rules (PenAI 방식)                 │
   │       ↓                                                     │
   │  [Smart Sizing Engine] ← Constraint Solver (Yoga WASM)      │
   │       ↓                                                     │
   │  [50+ Size Variants]                                        │
   │       ↓                                                     │
   │  [Auto QA Vision Check] ← Overlap/Clip detection            │
   │       ↓                                                     │
   │  [1-Click Export → CDN/Ad Platform API]                     │
   │                                                             │
   │  NO ONE ELSE CAN DO THIS FULL PIPELINE.                     │
   └─────────────────────────────────────────────────────────────┘
```

---

## PART 4: Concrete Integration Plan — "What to Build"

### Phase 1: AI Context Revolution (2 weeks)

**목표: AI를 "2-tool blind agent" → "90-tool context-aware agent"로**

| Action | Source | File |
|---|---|---|
| Scene Graph Query 추가 | OpenPencil `get_page_tree` 패턴 | `@/tools/readTools.ts` [NEW] |
| Element Relationship API | OpenPencil `node_ancestors/children` | `@/tools/readTools.ts` [NEW] |
| Design Token Analyzer | OpenPencil `analyze_colors/typography` | `@/tools/analyzeTools.ts` [NEW] |
| Tool Registry 리팩토링 | OpenPencil 12-category taxonomy | `@/services/toolRegistry.ts` [NEW] |
| MCP stdio 서버 | OpenPencil `@open-pencil/mcp` 패턴 | `ace-mcp-server/` [NEW] |

**현재 ACE:**
```typescript
// autoDesignService.ts — 2 tools
const tools = [RENDER_BANNER_TOOL, REARRANGE_BANNER_TOOL];
```

**목표 ACE:**
```typescript
// toolRegistry.ts — 40+ tools organized by category
const TOOL_CATEGORIES = {
  read:      [getPageTree, getNode, findNodes, getSelection, ...],
  create:    [createShape, createText, createImage, createGroup, ...],
  modify:    [setFill, setStroke, setFont, setLayout, moveNode, resizeNode, ...],
  structure: [deleteNode, cloneNode, groupNodes, reparentNode, ...],
  analyze:   [analyzeColors, analyzeTypography, analyzeSpacing, ...],
  sizing:    [addVariant, propagateToAll, smartResize, ...],  // ACE 고유!
  export:    [exportPNG, exportHTML5, exportToAdPlatform, ...], // ACE 고유!
};
```

### Phase 2: Multi-Agent Chain (3 weeks)

**목표: Penpot AI Wizard 패턴 → ACE에 3-Agent 파이프라인 구축**

```
User: "Make a Black Friday sale banner for Nike"
       ↓
┌─────────────────────────────────────┐
│ Agent 1: PLANNER                    │
│ - Reads brand kit (colors, fonts)   │
│ - Analyzes reference designs        │
│ - Decides layout strategy           │
│ - Outputs: design_plan.json         │
├─────────────────────────────────────┤
│ Agent 2: EXECUTOR                   │
│ - Follows design_plan               │
│ - Calls 40+ tools to build banner   │
│ - Places elements with constraints  │
│ - Outputs: completed banner         │
├─────────────────────────────────────┤
│ Agent 3: CRITIC                     │
│ - Takes screenshot (Vision API)     │
│ - Checks overlap, text clipping     │
│ - Checks brand compliance           │
│ - Checks hierarchy & spacing        │
│ - Outputs: fix_patches[] or "PASS"  │
└─────────────────────────────────────┘
       ↓ (if CRITIC says fix)
  → Agent 2 re-executes patches
  → Agent 3 re-checks
  → Loop until PASS
```

### Phase 3: Design Intelligence (6 weeks)

**목표: Penpot의 SVG 전처리 + PosterMaker의 레이아웃 지능**

| Feature | Inspiration | Implementation |
|---|---|---|
| **SVG Preprocessing** | PenAI — "리팩토링해서 AI에게 전달" | 우리 JSON 요소를 "의미 있는 설명"으로 변환 후 AI에 전달 |
| **Style Transfer Templates** | PenAI — "hover→disabled 변환 패턴" | 마스터→슬레이브 스타일 전파 개선 |
| **Semantic Auto-Naming** | PenAI — "AI가 레이어 이름 자동 지정" | 레이어 패널에서 자동 이름 |
| **Hierarchy Inference** | PenAI — "잘못된 그룹을 올바르게" | Smart Sizing 전 레이어 정리 |
| **Layout Zone Intelligence** | PosterMaker SceneGenNet | "제목은 상단, CTA는 하단, 제품은 중앙" 규칙 학습 |
| **Multi-Model Router** | Jaaz — 10+ AI 모델 전환 | OpenRouter 통합으로 Claude/GPT/등 자유 전환 |

---

## PART 5: Code Stabilization — How They Guard Quality

### Testing Benchmark

| Project | Unit Tests | E2E Tests | Total | Quality Gates |
|---|---|---|---|---|
| **OpenPencil** | **764** | **188** | **952** | `bun run check` + `bun run test` + `bun run format` |
| **Penpot** | ~500+ | ~200+ | ~700+ | CI/CD + ClojureScript strict |
| **Jaaz** | Unknown | None visible | **~0** | None visible |
| **PosterMaker** | Research code | N/A | N/A | Academic paper reproducibility |
| **ACE** | **20** | **0** | **20** | `npm test` (just added) |

### OpenPencil Quality Gate Pipeline (Copy This Exactly)

```bash
# OpenPencil의 CI pipeline — ACE가 복제해야 할 것
bun run check        # TypeScript strict type check
bun run test         # All 952 tests (unit + E2E)
bun run test:unit    # Fast unit-only for dev iteration
bun run format       # Code formatting consistency

# CI가 PR에서 자동 실행 — 실패 시 merge 차단
```

### ACE Immediate Actions

```bash
# 1. Pre-commit hook (30분)
npx husky init
echo "npm test && npx tsc --noEmit" > .husky/pre-commit

# 2. GitHub Actions CI (1시간)
# .github/workflows/ci.yml
# on: [push, pull_request]
# jobs: test → npm test → tsc --noEmit → build

# 3. Test coverage target (4주)
# Week 1: 20 → 50 (all stores)
# Week 2: 50 → 100 (hooks + services)
# Week 3: 100 → 150 (components)
# Week 4: 150 → 200 + 50 E2E (Playwright)
```

---

## PART 6: Proprietary Moat — What None of Them Can Ever Clone

| ACE Moat | Why It's Defensible | Competitor Gap |
|---|---|---|
| **Smart Sizing** | Constraint-based → 수학적 레이아웃 솔버 | 모든 경쟁사 수동 또는 단순 스케일 |
| **Banner Production Pipeline** | Master → 50 variants → QA → Export | 어느 누구도 전체 파이프라인 없음 |
| **Ad Platform Integration** | Google Ads / Meta / TikTok 직배포 | Figma도 플러그인 의존 |
| **Design Memory Bank** | AI가 좋은 디자인 패턴을 누적 학습 | PenAI가 유사하지만 배너 전문 아님 |
| **Vision QA Loop** | GPT-4o로 자동 디자인 품질 검사 | PosterMaker만 유사 (하지만 래스터 한정) |
| **Industry Vertical Intelligence** | 금융→정적, 패션→다이나믹 자동 판단 | 아무도 업종별 디자인 지능 없음 |

---

## PART 7: Revenue Architecture

```
          ┌──────────────────────────────────────┐
          │    F R E E   T I E R                  │
          │  - 3 creative sets                    │
          │  - 5 size variants                    │
          │  - Manual export (PNG only)           │
          │  - 50 AI generations/month            │
          ├──────────────────────────────────────┤
          │    P R O   ($29/mo)                   │
          │  - Unlimited creative sets            │
          │  - Unlimited variants                 │
          │  - All export formats (HTML5, MP4)    │
          │  - 500 AI generations/month           │
          │  - Brand Kit                          │
          │  - Design Memory Bank                 │
          ├──────────────────────────────────────┤
          │    T E A M   ($79/seat/mo)            │
          │  - Everything in Pro                  │
          │  - Real-time collaboration            │
          │  - Approval workflows                 │
          │  - Team Brand Kit enforcement         │
          │  - Ad Platform API integration        │
          │  - Priority AI (faster models)        │
          ├──────────────────────────────────────┤
          │    E N T E R P R I S E   (Custom)     │
          │  - Everything in Team                 │
          │  - On-prem deployment (like Jaaz)     │
          │  - Custom AI model training           │
          │  - White-label SDK                    │
          │  - SLA + dedicated support            │
          │  - Performance analytics integration  │
          └──────────────────────────────────────┘
```

**TAM Calculation:**
- Digital ad spend (2025): $740B globally
- Banner/display ad production: ~$15B/year
- Target addressable market: $5B (SMB + Agency)
- ACE capture target (5yr): 2% = **$100M ARR**
- Path to $1B: Enterprise + white-label SDK + platform fees

---

## Conclusion

| Dimension | Current State | Target State | How To Get There |
|---|---|---|---|
| **AI Tools** | 2 tools | 40+ tools | OpenPencil taxonomy + ACE-specific sizing/export |
| **AI Context** | Flat element list | Full scene graph + tokens | OpenPencil Read category + PenAI SVG preprocessing |
| **AI Architecture** | Single LLM call | 3-Agent chain (Plan→Execute→Critique) | Penpot AI Wizard pattern |
| **Testing** | 20 tests | 200+ unit + 50 E2E | OpenPencil quality gate pipeline |
| **Smart Sizing** | Proportional scale | Constraint solver | Yoga WASM (OpenPencil fork) |
| **Collaboration** | None | P2P WebRTC | OpenPencil/Penpot pattern |
| **Export** | PNG only | HTML5 + MP4 + Ad API | ACE proprietary |

**The Success Formula:**

> OpenPencil의 코드 품질 + Penpot의 AI 교육 패턴 + PosterMaker의 레이아웃 지능 + Jaaz의 모델 라우팅 + **ACE만의 배너 생산 파이프라인** = **Billion-Dollar Product**
