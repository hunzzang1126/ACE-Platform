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

# ABSOLUTE RULE: NO BROWSER TESTING BOT

> **NEVER use `browser_subagent` for QA or testing. EVER.**
> ACE uses Supabase Auth — the bot CANNOT log in. It will waste 100% of the time
> clicking around login screens. The user will test manually.
> Build, commit, push — then tell the user what to test. That's it.

---

# ACE Project Rules (North America Target)

0. **Sync Consistency — HIGHEST PRIORITY**:
   User selections must NEVER desync between views. If a user picks Korean in onboarding, Settings must show Korean. If a user selects Pro plan, every status bar must reflect Pro. **Every read/write of user state must use the same storage key (with userId).** Before closing any feature, manually verify: set a value in View A → navigate to View B → confirm the same value appears. This applies to: language, plan, brand kit, theme, and ALL user preferences. **Desync = broken trust = unacceptable.**

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
