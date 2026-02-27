// ─────────────────────────────────────────────────
// ACE QA Sweep — E2E Tests (acerule.md checklist)
// Run: npx playwright test
// Expects: npm run dev already running on :5173
// ─────────────────────────────────────────────────
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──
async function clearState(page: Page) {
    await page.evaluate(() => {
        localStorage.removeItem('ace-project-store');
        localStorage.removeItem('ace-design-store');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
}

async function goToDashboard(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
}

async function createCreativeSet(page: Page) {
    // Find the "New Creative Set" button
    const btn = page.getByRole('button', { name: /New Creative Set/i })
        .or(page.locator('button:has-text("New Creative Set")'));
    await btn.click();
    await page.waitForTimeout(500);
}

async function addDemoElements(page: Page) {
    const btn = page.getByRole('button', { name: /Demo/i })
        .or(page.locator('button:has-text("Demo")'));
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
    }
}

async function enterMasterEditor(page: Page) {
    const card = page.locator('.banner-card').first();
    await card.dblclick();
    await page.waitForURL(/\/editor\/detail\//);
    await page.waitForTimeout(500);
}

// ═══════════════════════════════════════════════════
// 1. DASHBOARD
// ═══════════════════════════════════════════════════
test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
    });

    test('renders heading', async ({ page }) => {
        await expect(page.locator('text=Creative Sets').first()).toBeVisible();
    });

    test('create new creative set navigates to editor', async ({ page }) => {
        await createCreativeSet(page);
        await expect(page).toHaveURL(/\/editor/);
    });

    test('no console errors on load', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.waitForTimeout(1500);
        const real = errors.filter(e => !e.includes('wasm') && !e.includes('Tauri') && !e.includes('WebGPU'));
        expect(real).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// 2. SIZE DASHBOARD
// ═══════════════════════════════════════════════════
test.describe('Size Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
        await createCreativeSet(page);
    });

    test('shows master variant 300×250', async ({ page }) => {
        await expect(page.locator('text=300 × 250').first()).toBeVisible();
    });

    test('add demo elements shows preview', async ({ page }) => {
        await addDemoElements(page);
        await expect(page.locator('.banner-element').first()).toBeVisible();
    });

    test('ADD SIZE button opens modal', async ({ page }) => {
        const addSizeBtn = page.locator('button:has-text("ADD SIZE")');
        await addSizeBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator('.modal-overlay, [class*="modal"]').first()).toBeVisible();
    });

    test('Play All button visible', async ({ page }) => {
        await expect(page.locator('button:has-text("Play All")').first()).toBeVisible();
    });

    test('double-click card opens detail editor', async ({ page }) => {
        await addDemoElements(page);
        await enterMasterEditor(page);
        await expect(page).toHaveURL(/\/editor\/detail\//);
    });
});

// ═══════════════════════════════════════════════════
// 3. CANVAS EDITOR
// ═══════════════════════════════════════════════════
test.describe('Canvas Editor', () => {
    test.beforeEach(async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
        await createCreativeSet(page);
        await addDemoElements(page);
        await enterMasterEditor(page);
    });

    test('canvas element renders', async ({ page }) => {
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('toolbar visible', async ({ page }) => {
        await expect(page.locator('.toolbar, [class*="toolbar"]').first()).toBeVisible();
    });

    test('save button exists', async ({ page }) => {
        const saveBtn = page.locator('button:has-text("Save")').first();
        await expect(saveBtn).toBeVisible();
    });

    test('back navigation works', async ({ page }) => {
        const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), [class*="back-btn"]').first();
        if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await backBtn.click();
            await page.waitForURL(/\/editor/);
        }
    });

    test('no console errors in editor', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.waitForTimeout(2000);
        const real = errors.filter(e =>
            !e.includes('wasm') && !e.includes('Tauri') &&
            !e.includes('WebGPU') && !e.includes('WebGL'));
        expect(real).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// 4. PANELS (Property + Layer)
// ═══════════════════════════════════════════════════
test.describe('Panels', () => {
    test.beforeEach(async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
        await createCreativeSet(page);
        await addDemoElements(page);
        await enterMasterEditor(page);
    });

    test('property panel visible', async ({ page }) => {
        await expect(page.locator('[class*="ed-right"], [class*="right-panel"]').first()).toBeVisible();
    });

    test('layer panel shows elements', async ({ page }) => {
        await expect(page.locator('[class*="layer"]').first()).toBeVisible();
    });

    test('timeline panel visible', async ({ page }) => {
        await expect(page.locator('[class*="timeline"], [class*="bottom-panel"]').first()).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════
// 5. SAVE & SYNC PERSISTENCE
// ═══════════════════════════════════════════════════
test.describe('Save & Sync', () => {
    test('data persists across navigation', async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
        await createCreativeSet(page);
        await addDemoElements(page);
        await page.waitForTimeout(500);

        // Navigate away to dashboard
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Check localStorage still has creative set with elements
        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem('ace-design-store');
            if (!raw) return 0;
            const state = JSON.parse(raw).state;
            const keys = Object.keys(state.allCreativeSets || {});
            if (keys.length === 0) return 0;
            const cs = state.allCreativeSets[keys[0]];
            const master = cs.variants.find((v: { id: string }) => v.id === cs.masterVariantId);
            return master?.elements?.length || 0;
        });
        expect(stored).toBeGreaterThan(0);
    });

    test('data survives page reload', async ({ page }) => {
        await goToDashboard(page);
        await clearState(page);
        await createCreativeSet(page);
        await addDemoElements(page);
        await page.waitForTimeout(500);

        // Reload (simulate app restart)
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Check localStorage has data
        const stored = await page.evaluate(() => {
            const raw = localStorage.getItem('ace-design-store');
            if (!raw) return 0;
            const state = JSON.parse(raw).state;
            return Object.keys(state.allCreativeSets || {}).length;
        });
        expect(stored).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════
// 6. TRASH
// ═══════════════════════════════════════════════════
test.describe('Trash', () => {
    test('trash page loads', async ({ page }) => {
        await page.goto('/trash');
        await page.waitForLoadState('domcontentloaded');
        const heading = page.locator('text=/Trash|Recycle/i');
        await expect(heading.first()).toBeVisible();
    });
});
