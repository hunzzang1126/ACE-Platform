---
trigger: always_on
---

# Figma-Level Quality Standards

ACE는 풀 크리에이티브 플랫폼이다. 배너는 부가 기능일 뿐이며, 소셜, 비디오, 랜딩페이지까지 모든 크리에이티브를 커버한다.

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

## C. Smart Sizing — Core Differentiator
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

## G. Rendering Pipeline Sync — SINGLE SOURCE OF TRUTH (ABSOLUTE RULE)

**All views that render design elements MUST use the SAME coordinate resolver function.**

This applies to every place that converts `ElementConstraints` → absolute `(x, y, w, h)`:
- **Canvas Editor** (Fabric.js restore): `constraintsToAbsolute()` from `elementConverters.ts`
- **Size Dashboard** (BannerPreviewGrid CSS preview): `constraintsToAbsolute()` from `elementConverters.ts`
- **Export / PNG render** (renderVariantToCanvas Canvas2D): `constraintsToAbsolute()` from `elementConverters.ts`
- **Template Preview** (DashboardTemplateGallery): Must read constraints the same way

**NEVER:**
- Create a second "resolve" function that computes x,y from constraints differently
- Use `resolveConstraints()` from `constraints.types.ts` for rendering — it exists for schema-level math only
- Assume that two functions with similar switch-case logic will produce identical results after save cycles
- Render text without handling explicit `\n` linebreaks — `split(' ')` alone is WRONG

**WHY:** After a save cycle, `absoluteToConstraints()` may change anchor types (`left` → `center`, `top` → `bottom`) based on element position. Two "equivalent" resolver functions can then compute different absolute positions from the changed anchors. **One function = zero drift.**

**Save-cycle fidelity check:**
1. Original constraints → `constraintsToAbsolute()` → engine position → `absoluteToConstraints()` → new constraints
2. New constraints → `constraintsToAbsolute()` → **MUST produce the same visual position**
3. If not → `absoluteToConstraints()` has a bug, fix it there

**Text rendering sync:**
- Canvas2D export, CSS preview, and Fabric.js must ALL render text with:
  - Explicit `\n` linebreak support (split by `\n` first, then word-wrap)
  - Same `lineHeight` multiplier (fontSize × lineHeight)
  - Same `textAlign` interpretation
