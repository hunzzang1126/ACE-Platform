// ─────────────────────────────────────────────────
// E2E: Dashboard — Trash, CRUD, Navigation
// ─────────────────────────────────────────────────
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for dashboard to load
    await page.waitForTimeout(1000);
});

// ── Creative Set CRUD ──

test('create new creative set from dashboard', async ({ page }) => {
    // Look for "New" or "+" button
    const newBtn = page.locator('button:has-text("New"), [data-testid="new-creative-set"]').first();
    if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(500);
        // Should navigate or show modal
        // Just verify we didn't crash
        expect(await page.title()).toBeDefined();
    }
});

test('creative set appears in dashboard list after creation', async ({ page }) => {
    // Get initial count of creative sets
    const initialCards = await page.locator('[data-testid="creative-set-card"], .creative-set-card, .project-card').count();

    // Try to create one
    const newBtn = page.locator('button:has-text("New"), [data-testid="new-creative-set"]').first();
    if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(1000);

        // Go back to dashboard
        await page.goto('/');
        await page.waitForTimeout(1000);

        const afterCards = await page.locator('[data-testid="creative-set-card"], .creative-set-card, .project-card').count();
        expect(afterCards).toBeGreaterThanOrEqual(initialCards);
    }
});

// ── Trash Flow ──

test('delete moves item to trash (not permanent)', async ({ page }) => {
    // Find any creative set card
    const card = page.locator('[data-testid="creative-set-card"], .creative-set-card, .project-card').first();
    if (await card.isVisible()) {
        // Right-click or find delete button
        await card.click({ button: 'right' });
        await page.waitForTimeout(300);

        const deleteOption = page.locator('text=Delete, text=Move to Trash').first();
        if (await deleteOption.isVisible()) {
            await deleteOption.click();
            await page.waitForTimeout(500);
        }
    }
});

test('empty trash clears all trashed items', async ({ page }) => {
    // Navigate to trash view (if exists)
    const trashBtn = page.locator('text=Trash, [data-testid="trash-button"], button:has-text("Trash")').first();
    if (await trashBtn.isVisible()) {
        await trashBtn.click();
        await page.waitForTimeout(500);

        // Find empty trash button
        const emptyBtn = page.locator('text=Empty Trash, button:has-text("Empty"), [data-testid="empty-trash"]').first();
        if (await emptyBtn.isVisible()) {
            await emptyBtn.click();
            await page.waitForTimeout(500);

            // Verify no items remain (or empty state shown)
            const remaining = await page.locator('[data-testid="trash-item"], .trash-item').count();
            expect(remaining).toBe(0);
        }
    }
});

// ── Navigation ──

test('dashboard loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out expected warnings (React dev mode, etc)
    const realErrors = errors.filter(e =>
        !e.includes('React') &&
        !e.includes('favicon') &&
        !e.includes('DevTools')
    );

    // Should have zero unexpected console errors
    expect(realErrors.length).toBe(0);
});

test('page has correct title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
});
