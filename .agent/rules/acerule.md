---
trigger: always_on
---

# CODE QUALITY FIRST — HIGHEST PRIORITY RULE

> **Code quality is the #1 priority. Above features. Above bug fixes. Above speed.**
> A feature added to a 500-line file is NEGATIVE progress — it creates future bugs.
> **NEVER sacrifice structure for speed. Fix the structure FIRST, then add the feature.**

**MANDATORY: Pre-Edit Line Count Check**
> Before modifying ANY file, run `wc -l <file>` mentally or literally.
> - If file is **350+ lines**: you MUST extract/split BEFORE adding new code.
> - If file is **400+ lines**: this is a **HARD BLOCK** — refactor into sub-modules first. No exceptions.
> - If your edit would push a file past 350 lines: split first, edit second.
> **Skipping this check is a violation. Every time.**

**MANDATORY: Pre-Commit Verification**
> Before every `git commit`, verify:
> 1. `npx tsc --noEmit` — zero type errors
> 2. `npx vitest run` — all tests pass
> 3. No source file exceeds 400 lines (check with `wc -l` on modified files)
> If any check fails → fix before commit. Never commit violations.

**Why This Exists:**
> - 31 files in ACE exceeded 400 lines as of v0.0.0.281
> - Every recurring bug (z-order, headline persistence, text placeholders) traces back to monolith files
> - Monolith files = impossible to maintain = bugs that get "fixed" then come back
> - This rule was added because it was written but NOT enforced. Now it IS the top rule.

---

# ACE PLATFORM IDENTITY — READ THIS FIRST

> **ACE is an AI AD CREATIVE PLATFORM.**
> Year 1 focus: Display Ads, Social Ads, Video Ads.
> Year 2 expansion: Social media creatives, broader formats.
> The killer differentiator is: **AI designs it → Smart Sizing scales it to 50 sizes.**
>
> **Positioning hierarchy:**
> - ❌ "Banner tool" — too narrow, 2010s feel
> - ❌ "Full Creative Platform" — overpromises vs. current reality, competes with Canva/Figma
> - ✅ **"AI Ad Creative Platform"** — clear niche, clear buyer (agencies, performance marketers)
>
> NEVER refer to ACE as a "banner editor" or "banner tool" in code, comments, or UI.
> In code: prefer `creative`, `size`, `variant` over `banner`. Example:
> `BANNER_PRESETS` → `SIZE_PRESETS`, `BannerVariant` → `SizeVariant`
>
> Think Creatopy + AI superpowers, not Figma competitor.

---

# BRAND IDENTITY — GLID DESIGN SYSTEM (ABSOLUTE RULE)

> **Official Brand Palette — derived from the product demo video:**
>
> | Role | Color | HEX | Usage |
> |------|-------|-----|-------|
> | **Primary** | Mint Teal | `#2DD4BF` | Main accent, badges, active states |
> | **Secondary** | Indigo | `#6366F1` | Buttons (gradient start), links, focus rings |
> | **Dark BG** | Deep Navy | `#0B0F1A` | Dark theme background, landing page |
> | **Light BG** | Soft Gray | `#F0F2F5` | Light theme background |
> | **Text Dark** | Near Black | `#1A1A2E` | Text on light backgrounds |
> | **Text Light** | Soft White | `#F1F5F9` | Text on dark backgrounds |
> | **Canvas BG** | Warm White | `#FFFFFF` | Canvas/card surfaces |
>
> **Gradient Rules:**
> - **CTA/Button gradient**: `linear-gradient(135deg, #6366F1, #2DD4BF)` (Indigo → Mint)
> - **Gradient text**: `linear-gradient(135deg, #2DD4BF, #818cf8, #c084fc)` — purple (#c084fc) is **only** the tail end
> - **Purple usage**: `#c084fc` / `#818cf8` may appear ONLY as a subtle gradient endpoint. **NEVER as a primary or dominant color.**
> - **No standalone purple**: No `#7c3aed`, no purple backgrounds, no purple text. If purple is visible, it must be blended with teal/indigo in a gradient.
>
> **Contrast Rules:**
> - Light mode: dark text (`#1A1A2E`) on light backgrounds (`#F0F2F5`)
> - Dark mode: light text (`#F1F5F9`) on dark backgrounds (`#0B0F1A`)
> - Buttons with gradient backgrounds → **always white text** (`#FFFFFF`)

---

# AI AGENT QUALITY STANDARD — CURSOR IS THE MINIMUM BENCHMARK

> **ACE's AI agent MUST surpass Cursor-level quality. This is non-negotiable.**
> Cursor is the bar. ACE must exceed it in every dimension.
>
> **System Prompt**: Max ~300-500 tokens. Rules only — no verbose tool descriptions,
> no layout blueprints, no repeated boilerplate. API references go in tool results,
> not system prompts. If the system prompt exceeds 500 tokens, it's too fat — trim it.
>
> **Token Efficiency**: Eval-first architecture. The AI writes JS code via
> `execute_dynamic_action` to manipulate stores directly. Narrow tools are dead weight.
> Every unnecessary tool schema = wasted tokens = wasted money.
>
> **Streaming Narration**: The AI MUST explain what it's doing in real-time.
> "Thinking..." → "Changing headline color..." → "Done." Like Cursor's streaming output.
> Silent execution is unacceptable — users must see progress.
>
> **Context Awareness**: The AI reads a live workspace snapshot before every interaction.
> It knows: current page, elements, canvas size, project name. No blind guessing.
>
> **Memory**: Post-interaction fact extraction → Supabase. The agent gets smarter
> across sessions. Cursor doesn't even do this — ACE must.
>
> **ALWAYS ASK**: "Would Cursor's agent handle this better?" If yes, we're not done.

---

# ABSOLUTE RULE: NO BROWSER TESTING BOT

> **NEVER use `browser_subagent` for QA or testing. EVER.**
> ACE uses Supabase Auth — the bot CANNOT log in. It will waste 100% of the time
> clicking around login screens. The user will test manually.
> Build, commit, push — then tell the user what to test. That's it.

---

# EDITOR FEATURE STABILITY — 6-STEP VERIFICATION (ABSOLUTE RULE)

> **Every editor feature (new or modified) MUST pass ALL 6 checks before merge.**
> Skipping any step risks data loss, rendering desync, or export corruption.
> **A broken feature is worse than no feature. Stability > Speed.**
>
> 1. **Canvas Editor**: Feature works correctly in the Fabric.js editor
> 2. **Save → Restore**: Save → exit → re-enter → **pixel-identical restoration**
> 3. **Size Preview Grid**: Element appears correctly in SizePreviewGrid (`constraintsToAbsolute()`)
> 4. **Export (PNG/HTML5)**: Exported output matches canvas exactly
> 5. **Admin Template Editor**: Feature works identically when editing a global template.
>    Template save logic (`overrideTemplate`) must NOT corrupt data.
> 6. **Single Resolver**: ALL views use `constraintsToAbsolute()` from `elementConverters.ts`.
>    NEVER create a second resolver function. One function = zero drift.
>
> **If ANY check fails → do NOT merge. Fix first.**
> **If a feature cannot satisfy all 6 checks → defer it. Do not ship broken.**

---

# API KEY SECURITY — NO CLIENT-SIDE SECRETS (ABSOLUTE RULE)

> **NEVER expose API keys in client-side code.**
> `VITE_*` environment variables are bundled into the browser build and visible to anyone.
> All third-party API calls (OpenRouter, image generation, etc.) MUST go through:
>   - Supabase Edge Functions, OR
>   - A backend server proxy
>
> **Current violation**: `VITE_OPENROUTER_API_KEY` is in the client bundle.
> **Remediation**: Task 6-1 (Server Proxy) — until completed, this is a known risk.
> **After fix**: No `VITE_*` variable should contain an API secret. Only public keys (Supabase anon key, Stripe publishable key) are acceptable in `VITE_*`.

---

# TEMPLATE MARKETPLACE QUALITY GATE (RULE)

> **User-submitted templates MUST pass a 2-stage curation:**
>
> **Gate 1 — AI Quality Score (Automated)**:
> - Use `creativeScore.ts` / `designScoreEngine.ts` (already built)
> - Minimum score: **70/100** to proceed
> - Auto-reject triggers: text overlap, insufficient contrast, empty canvas, resolution below threshold
> - On rejection: show actionable feedback ("Improve text contrast", "Elements are overlapping")
>
> **Gate 2 — Admin Approval (Manual)**:
> - Only templates passing Gate 1 appear in the Admin review queue
> - Admin can Approve / Reject with optional feedback
> - Approved templates go live in the marketplace
>
> **Never allow unvetted user content into the public template library.**
> Bad templates = users lose trust in the platform = churn.

---

# ACE Project Rules (North America Target)

0. **Sync Consistency — HIGHEST PRIORITY**:
   User selections must NEVER desync between views. If a user picks Korean in onboarding, Settings must show Korean. If a user selects Pro plan, every status bar must reflect Pro. **Every read/write of user state must use the same storage key (with userId).** Before closing any feature, manually verify: set a value in View A → navigate to View B → confirm the same value appears. This applies to: language, plan, brand kit, theme, and ALL user preferences. **Desync = broken trust = unacceptable.**

1. **Role Separation**: Strictly follow the Single Responsibility Principle. A file can have 300-600 lines ONLY IF it serves a single, cohesive purpose. Mixing UI, API, and Canvas logic in one file is strictly prohibited.
2. **Modular Hooks**: Extract all logic into Custom Hooks. Components must remain "thin" and focus on rendering.
3. **Language / i18n**: All UI text must use the global i18n system (`useAppI18n()` hook). **No hardcoded English strings in JSX.** The user's onboarding language selection determines the ENTIRE platform language — dashboard, editor, panels, AI agent responses, toast messages, everything. The AI agent must receive the current language and respond in that language.
4. **No Emojis in UI — ABSOLUTE RULE**: **ZERO emoji characters** in any UI label, button, title, placeholder, status message, badge, or notification. This is a professional tool — emojis look cheap and instantly degrade product quality. Use clean typography, geometric SVG icons, or simple text characters (·, +, ×) instead. **No exceptions. Ever.** Reference: Apple, Figma, Linear — none use emojis in their product UI. ACE must meet the same standard.
5. **Project Structure**:
   - `main.py` / `App.tsx`: Entry points only.
   - `/components`: Pure UI elements.
   - `/hooks`: Business logic and state orchestration.
   - `/engines`: Fabric.js & Canvas manipulation.
   - `/schemas`: Zod or Type definitions.
   - `/i18n`: Translation files and i18n hooks.
6. **AI Integration**: Design interactions as JSON-based tools. Keep the AI pipeline **simple but smart** — avoid over-engineering. Existing `designStyleGuides.ts` + `goldenExamples` are sufficient for design quality. No additional "Design Recipe DB" layers unless proven necessary by repeated failures.

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
   - **NEVER accumulate uncommitted changes** — if you've made 2+ changes without committing, STOP and commit now
   - If a task involves multiple files, commit after EACH logical unit (not at the very end)
   - **Rationale**: Code loss = wasted API cost + wasted user time. This is UNACCEPTABLE.

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
