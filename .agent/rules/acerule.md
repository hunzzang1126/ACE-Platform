---
trigger: always_on
---

# ACE PLATFORM IDENTITY — READ THIS FIRST

> **ACE is a FULL CREATIVE PLATFORM — NOT a banner tool.**
> Banners and banner resizing are ONE supplementary feature.
> ACE enables creation of: social media creatives, video ads, static landing pages,
> display banners, rich media, and ANY visual creative format.
> NEVER refer to ACE as a "banner editor" or "banner tool" in code, comments, or UI.
> The AI agent, design engine, and all features must be built with this
> platform-level ambition in mind. Think Figma + Pencil.dev, not BannerFlow.

---

🛠️ ACE Project: AI Coding Rules & Guidelines
1. General Principles & Architecture
Module-First Approach: 모든 기능은 독립적인 모듈로 분리한다. 특정 기능을 수정할 때 다른 모듈에 영향을 주지 않도록 한다.

Orchestrator Pattern: main.py나 App.tsx 같은 진입점은 오직 모듈들을 실행하고 연결하는 '지휘자' 역할만 수행한다. 실제 비즈니스 로직이나 복잡한 계산은 반드시 전용 Hook이나 Service 모듈에 위치시킨다.

English-Only UI/UX: 북미 시장이 타겟이므로, 소스 코드 내의 모든 UI 텍스트, 플레이스홀더, 알림 메시지는 **반드시 영어(English)**로 작성한다. (주석은 개발 편의를 위해 한국어 허용).

2. Frontend & Rendering Rules (PixiJS + React)
Hook-Driven Logic: 모든 상태 변화와 사이드 이펙트는 React Hooks(useCanvas, useBannerSync, useAIAgent)로 관리한다. 컴포넌트 내부에는 UI 마크업만 남긴다.

Atomic CSS (Tailwind): app.css에는 글로벌 테마와 변수만 정의하고, 스타일링은 Tailwind CSS를 기본으로 사용한다. CSS 클래스 명명 규칙으로 고민하는 시간을 최소화한다.

High-Performance Rendering: * PixiJS 객체는 React State에 직접 담지 않는다 (성능 저하 방지).

Ref를 통해 캔버스 엔진에 접근하고, 데이터 동기화는 Zustand 또는 Pub/Sub 모델을 사용한다.

3. AI Agent & Data Contract
JSON-Centric Design: 모든 디자인 상태는 직렬화 가능한 JSON 구조로 유지한다. 이는 AI(Claude 4.6)가 디자인을 '읽고 쓸 수 있는' 유일한 통로다.

Atomic Functions for AI: AI 에이전트가 호출할 함수(Tool Use)는 최대한 작고 명확하게 만든다.

예: updateElementColor(id, color) (O) / makeDesignBetter() (X)

Vision Feedback Loop: 모든 리사이징 작업 후에는 반드시 스크린샷 캡처 및 Vision API(GPT-4o) 검증 단계를 거치도록 로직을 설계한다.

4. Technical Efficiency (시행착오 방지 룰)
Zod Schema Validation: 모든 데이터 피드와 디자인 JSON은 Zod를 사용하여 런타임에 타입을 검증한다. 잘못된 데이터가 엔진을 망가뜨리는 것을 방지한다.

Early Return & Error Handling: 모든 함수는 예외 상황을 먼저 처리(Early Return)하고, 사용자에게 보여줄 에러 메시지는 친절한 영어 문장으로 작성한다.

Wasm Bridge: 복잡한 레이아웃 계산(Constraint-based)은 Rust로 작성된 Wasm 모듈을 호출하며, 이 브릿지 코드는 useLayoutEngine 훅 하나로 캡슐화한다.

# ACE Project Rules (North America Target)

1. **Role Separation**: Strictly follow the Single Responsibility Principle. A file can have 300-600 lines ONLY IF it serves a single, cohesive purpose. Mixing UI, API, and Canvas logic in one file is strictly prohibited.
2. **Modular Hooks**: Extract all logic into Custom Hooks. Components must remain "thin" and focus on rendering.
3. **Language**: The entire UI must be in English. No Korean text in the production code.
4. **No Emojis in UI — ABSOLUTE RULE**: **ZERO emoji characters** in any UI label, button, title, placeholder, status message, badge, or notification. This is a professional tool — emojis look cheap and instantly degrade product quality. Use clean typography, geometric SVG icons, or simple text characters (·, +, ×) instead. **No exceptions. Ever.** Reference: Apple, Figma, Linear — none use emojis in their product UI. ACE must meet the same standard.
4. **Project Structure**:
   - `main.py` / `App.tsx`: Entry points only.
   - `/components`: Pure UI elements.
   - `/hooks`: Business logic and state orchestration.
   - `/engines`: PixiJS & Canvas manipulation.
   - `/schemas`: Zod or Type definitions.
5. **AI Integration**: Design interactions as JSON-based tools. Every AI-driven layout change must be verifiable via vision-check logic.

6. **Proactive QA Sweep (매 작업 후 필수)**:
   After implementing ANY significant change (bug fix, feature, refactor), run a **full exploratory QA sweep** via browser before considering the task complete. Test like a real user — not just the changed feature, but ALL connected flows.

   **Checklist (skip items not relevant to the change):**
   - **Dashboard**: Create / Rename / Duplicate / Delete(→Trash) / Search / Sort / Folder navigation
   - **Size Dashboard**: Add/remove variant / Preview grid / Double-click to editor / Back navigation
   - **Canvas Editor**: Add shape/text/image / Select / Drag (all directions) / Resize (8 handles) / Delete / Duplicate(⌘D) / Zoom / Pan / Color / Opacity / Text editing
   - **Property Panel**: Transform values update / Color picker / Font controls / Text Alignment / Canvas Alignment (6 dirs)
   - **Layer Panel**: All elements listed / Click→select / Drag reorder / Visibility toggle / Lock toggle / Rename
   - **Animation**: Apply preset / Play→off-screen start / Stop→design position / Replace (not stack) / None→clear / Drag works when stopped
   - **Save/Sync**: Manual save→exit→re-enter / Auto-save→exit→re-enter / Full round-trip (Canvas→Sizes→Dashboard→back)
   - **Console**: No unhandled errors during all above flows

   **Rule**: If ANYTHING fails → fix → re-test → commit only when clean. Do NOT skip this step.
   **Rule**: Use chained flow testing — every test ends with `save → exit → re-enter → verify`.
   **Rule**: Git commit after each Part passes. Never commit broken code.

7. **Git Discipline (MANDATORY — Zero Code Loss Policy)**:
   - **EVERY successful code change MUST be committed immediately** — no exceptions
   - After ANY build-passing edit → `git add -A && git commit -m "..."` RIGHT AWAY
   - Commit messages must be descriptive: `feat:`, `fix:`, `refactor:`, `chore:` prefixes
   - Before editing a file, verify it compiles first
   - After editing, verify no regressions in connected features
   - **NEVER accumulate uncommitted changes** — if you've made 2+ changes without committing, STOP and commit now
   - If a task involves multiple files, commit after EACH logical unit (not at the very end)
   - **Rationale**: Code loss = wasted API cost + wasted user time. This is UNACCEPTABLE.

   **Regression Test Gate (MANDATORY — ZERO EXCEPTIONS)**:
   - **After EVERY significant code change, the AGENT MUST run `npm test` AUTOMATICALLY** — do NOT wait for the user to ask
   - **After changes to UI flows, multi-tab sync, canvas, or navigation**, also run `npm run test:e2e` (requires dev server running)
   - If tests fail → the change BROKE something → fix it before committing
   - If you INTENTIONALLY changed behavior → update the corresponding `.test.ts` file FIRST, then change the code
   - Never delete or skip a failing test — either fix the code or update the test to match new intended behavior
   - When fixing a NEW bug → add a test case for it in the relevant `.test.ts` file
   - Commit sequence: `code change → npm test → pass → git commit`
   - Test files live next to their source: `projectStore.ts` → `projectStore.test.ts`
   - E2E tests live in `e2e/` folder: `dashboard.spec.ts`, `multi-tab-sync.spec.ts`, `canvas-editor.spec.ts`, `size-dashboard.spec.ts`

   **Test Commands (agent must know and use these automatically)**:
   - `npm test` — run 114+ unit tests (Vitest, ~1s) — run after EVERY code change
   - `npm run test:e2e` — run 37+ E2E tests (Playwright, ~30s) — run after UI/sync/flow changes
   - `npm run test:coverage` — generate coverage report (V8) — run periodically
   - `npx tsc --noEmit` — TypeScript type check — run after type changes
   - **The agent MUST run these proactively. The user should NEVER have to ask "did you run the tests?"**

   **When to Run Which Test**:
   - Store logic changes (projectStore, designStore, etc.) → `npm test`
   - Engine logic changes (smartSizing, brandPalette, etc.) → `npm test`
   - Schema/type changes → `npm test` + `npx tsc --noEmit`
   - UI component changes → `npm test` + `npm run test:e2e`
   - Sync/BroadcastChannel changes → `npm run test:e2e` (multi-tab tests)
   - Canvas/layer/property panel changes → `npm run test:e2e`
   - ANY change before git commit → `npm test` at minimum

   **Zustand Store Safety (MANDATORY — prevents recurring bugs)**:
   - **NEVER call external Zustand stores inside immer `set()` callbacks** — causes silent deadlock
   - Always call `useOtherStore.getState().action()` BEFORE or AFTER the `set()` block, never inside
   - Cross-tab sync: ALWAYS use plain-object `setState({...})`, NEVER use immer mutator callbacks
   - Look for `★ REGRESSION GUARD` comments in store files — these mark previously-fixed patterns


8. **Code Maintainability (Clean Architecture — Zero Tech Debt Policy)**:

   **File Size Limits:**
   - **Hard limit: 400 lines** per file. If a file approaches this, immediately plan extraction.
   - **Ideal: 150-300 lines** — each file should serve ONE cohesive purpose.
   - A file can exceed 300L ONLY IF it serves a single, cohesive responsibility (e.g., one complex hook, one component with no sub-components).
   - **NEVER mix UI components + business logic + type definitions in one file.**

   **When to Extract:**
   - Sub-components inside a parent → separate `ComponentName.tsx`
   - Inline styles/constants → `componentStyles.ts` or `componentHelpers.ts`
   - Types shared by 3+ files → `types.ts` or `featureTypes.ts`
   - Hooks over 200L → split by concern (keyboard, sync, drag, etc.)
   - Switch/case blocks over 15 cases → split into executor/handler modules

   **Extraction Rules:**
   - **Always re-export** from the original file for backward compatibility (avoid mass import rewrites).
   - **Build check after every extraction** — `tsc --noEmit` must pass before moving on.
   - **One commit per extraction** — atomic, reversible changes.
   - **Delete dead code immediately** — orphaned files, unused imports, commented-out blocks.

   **File Naming Conventions:**
   - Components: `PascalCase.tsx` (e.g., `LayerRow.tsx`, `TimelineBar.tsx`)
   - Hooks: `camelCase.ts` with `use` prefix (e.g., `useCanvasKeyboard.ts`)
   - Types: `camelCase.ts` with descriptive suffix (e.g., `canvasTypes.ts`)
   - Executors: `camelCase.ts` with category prefix (e.g., `designExecutor.ts`, `projectExecutor.ts`)
   - Helpers/Utils: `camelCase.ts` with `Helpers` suffix (e.g., `bottomPanelHelpers.ts`)
   - Styles: `camelCase.ts` with `Styles` suffix (e.g., `aiChatStyles.ts`)

   **Dependency Direction (Layer Rules):**
   ```
   Pages → Components → Hooks → Stores → Types/Schema
                ↓
            UI Components (no business logic)
   ```
   - Hooks NEVER import from Components
   - Stores NEVER import from Hooks or Components
   - Types/Schema files have ZERO imports from project code

   **Import Hygiene:**
   - `import type {}` for all type-only imports (better tree-shaking)
   - Absolute imports via `@/` alias — no relative `../../` beyond 1 level
   - Group imports: React → External libs → Internal modules → Types → Styles


📝 안티그레비티/에디터에 바로 붙여넣을 요약본 (영문 포함)
이 요약본은 클로드 4.6이 읽었을 때 가장 잘 알아듣는 형태입니다.

[Project Rules: ACE Engine]

UI Language: All User Interface elements, labels, and messages must be in English (Target: North America).

Modular Entry: Entry points (e.g., main.py, App.tsx) must be lightweight. Use Hooks and Services for all logic.

State Management: Use Zustand for global state. Canvas-specific objects must be managed outside of React state for performance.

Styling: Use Tailwind CSS. Keep app.css minimal (Global variables only).

Reliability: Implement Zod for schema validation. AI Agent must interact via predefined, atomic JSON-based tools.

Performance: Use PixiJS (WebGPU) for rendering. Use OffscreenCanvas for heavy background tasks.


# 🏆 Figma-Level Quality Standards — "크리에이티브의 정점"

ACE는 풀 크리에이티브 플랫폼이다. 배너는 부가 기능일 뿐이며, 소셜, 비디오, 랜딩페이지까지 모든 크리에이티브를 커버한다.
아래는 Figma / BannerFlow / Google Web Designer 수준의 품질을 달성하기 위한 기준.

## A. Performance Standards (60fps, Zero Jank)
- **All canvas interactions must run at 60fps**: drag, resize, pan, zoom, animation playback
- **No frame drops during animation preview** — use `requestAnimationFrame`, never `setInterval`
- **Debounce expensive operations** (store writes, API calls) — never block the main thread
- **Canvas render cycle**: React renders overlay DOM, WASM engine renders shapes — both must be independent and non-blocking
- **Target**: Cold start < 2s, page navigation < 300ms, element interaction < 16ms

## B. UX Polish (피그마 수준의 인터랙션)
- **Every clickable element must have hover feedback** — color shift, cursor change, or scale
- **Smooth transitions on all UI state changes** — panel open/close (300ms ease), tool switch, selection change
- **Cursor feedback**: crosshair for draw, move for drag, resize cursors for handles, grab/grabbing for pan
- **Keyboard shortcuts for power users**: ⌘D duplicate, ⌘Z undo, Delete/Backspace remove, Space+drag pan, ⌘K AI, Enter confirm
- **Toast/snackbar notifications** for save success, errors, AI completion — never silent failures
- **Loading states**: spinner or skeleton for any operation > 200ms
- **Empty states**: friendly message + action button when lists are empty (no blank screens)

## C. Smart Sizing — Core Differentiator (핵심 경쟁력)
- **Constraint-based positioning**: elements are anchored relative to canvas edges, not absolute pixels
- **Master→Slave propagation**: edit once on master, auto-resize to ALL variants
- **Proportional scaling**: maintain visual balance across 300x250 → 970x250 → 160x600 etc.
- **Text reflow**: auto-resize font or box when scaling to different aspect ratios
- **Override system**: any variant can break from master for custom adjustments
- **Preview grid**: see ALL sizes simultaneously, spot issues before export
- **Smart sizing must NEVER produce overlapping elements, clipped text, or invisible content**

## D. Data Integrity — Zero Data Loss
- **Save is sacred**: user data must NEVER be lost under any circumstance
- **Auto-save on every navigation** (unmount, route change, tab close)
- **Manual save always available** with visual confirmation
- **Persist to localStorage via Zustand middleware** — survives refresh, tab close, browser restart
- **Round-trip fidelity**: Canvas → Store → localStorage → Rehydration → Canvas must be pixel-identical
- **Never skip saving** empty state — user may have intentionally cleared the canvas
- **Hidden/locked elements must survive save/load cycle**

## E. Visual Design Standards
- **Dark theme as default** — professional creative tool aesthetic (like Figma dark mode)
- **Consistent color system**: use CSS custom properties for all colors, never hardcode
- **Typography**: Inter/system-ui for UI, user's chosen font for canvas content
- **Spacing**: 4px grid system for all padding/margin
- **Icons**: consistent icon set (custom SVG components), never mix icon libraries
- **No unstyled elements**: every button, input, select, slider must match the design system
- **Panel layout**: collapsible, resizable panels — users control their workspace

## F. Error Resilience
- **Graceful degradation**: if WebGPU fails → fallback message, never white screen
- **Try/catch around all engine calls** — WASM can panic, React must survive
- **Schema validation on load**: if saved data is corrupted, show warning + load what's possible
- **Network errors (AI agent)**: show friendly message, retry button, never hang
- **Console must be CLEAN**: no red errors during normal flows — warnings are acceptable only if documented
