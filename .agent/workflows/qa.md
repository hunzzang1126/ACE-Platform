---
description: Level Ω QA — Automated test + AI self-heal + visual sweep
---
// turbo-all

# /qa — Level Ω QA Sweep

This workflow runs a comprehensive QA sweep with 3 phases:
- **Phase 1**: Playwright E2E tests (fast, catches regressions)
- **Phase 2**: AI self-healing loop (fix any failures → re-run)
- **Phase 3**: Browser visual sweep (catch what Playwright can't)

## Steps

### Phase 1: Playwright Fast-Check

1. Run the Playwright E2E test suite against the running dev server:
```bash
cd /Users/younghoonan/Documents/ACE && npx playwright test --reporter=list 2>&1 | tail -40
```

2. **If all tests pass** → proceed to Phase 3 (visual sweep).
   **If any tests fail** → proceed to Phase 2 (self-heal).

### Phase 2: AI Self-Heal Loop

3. For each failing test:
   - Read the error message and identify the root cause
   - Open the relevant source file and fix the bug
   - Re-run ONLY the failing test to confirm the fix:
   ```bash
   cd /Users/younghoonan/Documents/ACE && npx playwright test -g "TEST_NAME" --reporter=list
   ```
   - If it still fails, iterate until it passes
   - After all individual fixes, re-run the full suite:
   ```bash
   cd /Users/younghoonan/Documents/ACE && npx playwright test --reporter=list 2>&1 | tail -40
   ```
   - Repeat until ALL tests pass

### Phase 3: Browser Visual Sweep

4. Open the browser at http://localhost:5173 and perform a visual QA sweep following the acerule.md checklist:

   **Dashboard sweep:**
   - Create / Rename / Delete a creative set
   - Verify list updates correctly

   **Size Dashboard sweep:**
   - Add demo elements → verify preview cards render
   - Add new sizes → verify Smart Sizing repositions correctly
   - Click Play All → verify animation plays
   - Double-click card → verify editor opens

   **Canvas Editor sweep:**
   - Add shape/text element
   - Select → Drag (all directions) → Resize (handles)
   - Delete (Backspace) → Undo (⌘Z)
   - Change color/opacity in property panel
   - Save & Propagate → verify toast/confirmation

   **Animation sweep:**
   - Select element → Apply preset (Fade, Slide)
   - Play/Stop timeline
   - Verify animation renders correctly

   **Save/Sync chained flow:**
   - Save in editor → go back to sizes → go to dashboard → re-enter → verify data intact

   Take screenshots of any issues found.

5. If visual issues are found:
   - Fix the code
   - Re-run Playwright tests to confirm no regressions
   - Re-check the visual issue in the browser

### Phase 4: Report & Commit

6. After all phases pass:
   - Commit all fixes with a descriptive message
   - Generate a summary report with:
     - Total tests: X passed / Y total
     - Bugs found and fixed: list
     - Screenshots of verified features
   - Notify the user with the results
