---
trigger: always_on
---

# Testing, Deployment & Code Quality Rules

## 1. Mandatory Test Coverage (ABSOLUTE RULE)

**Core Principle: Every code change MUST include corresponding test updates.**

**When Adding a New Feature:**
- Write unit tests for ALL exported functions, hooks, and utilities
- Test file alongside source: `myModule.ts` → `myModule.test.ts`
- Cover: happy path, edge cases, error conditions, boundary values
- Minimum: 3+ test cases per exported function

**When Fixing a Bug:**
- **FIRST** write a failing test that reproduces the exact bug
- Then fix the code so the test passes
- Name descriptively: `it('should not lose z-index after manual layer reorder')`

**When Refactoring:**
- Run `npm run test:coverage` BEFORE and AFTER
- Coverage must NOT decrease
- If splitting files, split tests to match

**Test Quality:**
- No `test.todo()` or skipped tests
- Descriptive names, isolated tests, mock external deps
- Test the contract, not the implementation

**Coverage Targets:**
- Stores: 90%+ | Engine: 85%+ | Hooks: 80%+ | Converters: 95%+
- Commit sequence: `code → tests → npm test → pass → git commit`

## 2. Honest Feedback Policy (No Yes-Man Behavior)

- **Good idea** → Say why it's good technically
- **Bad idea** → Say why with concrete technical reasons
- **Partially good** → Acknowledge good parts, push back on weak parts
- Never agree just to avoid conflict
- Never implement what you know will cause problems without warning
- Quantify risk: "This will take ~3 weeks and blocks Z"
- Reference precedent: "Figma does X instead because..."

## 3. Version Increment on Git Push (MANDATORY)

- Before EVERY `git push`, increment build number in `src/version.ts`
- Format: `v{major}.{minor}.{patch}.{build}` (e.g., `v0.0.0.3`)
- Only build number auto-increments; major/minor/patch changed by user
- Commit sequence: code → tests → increment version → commit → push
- **NEVER push without incrementing**

## 4. Git Branching & Vercel Deployment Strategy (MANDATORY)

**Branch Structure:**
- `feat/landing-auth` — dev branch → **Vercel preview** (`ace-platform-six.vercel.app`)
- `main` — production branch → **main domain** (production Vercel)

**Rules:**
- All dev pushes → `feat/landing-auth` → auto-deploys to Vercel preview
- **NEVER merge to `main` unless user explicitly requests**
- When merging: `git checkout main && git merge feat/landing-auth && git push origin main`
- After merge, switch back: `git checkout feat/landing-auth`

**Vercel Env Vars:**
- All `VITE_*` vars must be in both Vercel settings AND local `.env`
- After adding locally: `npx vercel env add VAR_NAME production --yes`
- Redeploy auto-triggers on git push to connected branch

## 5. Progressive Test Coverage (MANDATORY — Coverage Must Only Go Up)

**Core Principle: Test count MUST increase with every feature or bug fix commit. It must NEVER decrease.**

**Before every push, verify:**
```bash
npm test 2>&1 | grep 'Tests'
# Must show equal or higher count than previous push
```

**When modifying ANY file, add tests for:**
- The specific function/behavior you changed
- Edge cases you discovered while implementing
- Regression guards for bugs you fixed (name: `it('★ REGRESSION: should not [describe bug]')`)

**Rendering/Sync bug tests (MANDATORY after sync fixes):**
- If you fix a rendering inconsistency → add a test that validates the resolver output
- If you fix element overlap → add a test that checks element bounding boxes don't overlap
- If you fix text rendering → add a test that verifies linebreak handling
- Example: `builtInTemplates.test.ts` has overlap and alignment guards — add similar tests for ANY new template or layout fix

**Progressive targets (ratchet — never go backwards):**

| Module | Current | Target | Rule |
|--------|---------|--------|------|
| Stores | 49% | 90%+ | +tests with every store change |
| Engine | varies | 85%+ | +tests with every converter/renderer change |
| Services | 14% | 80%+ | +tests when adding/modifying any service |
| Hooks | varies | 80%+ | +tests for any new hook logic |

**Tracking:**
- Each commit message should note test delta: `(458 → 490 tests)`
- If a commit has 0 new tests and modifies logic → **STOP and add tests before pushing**
- Coverage must be checked with `npx vitest run --coverage` at least once per session
