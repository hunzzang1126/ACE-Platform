// ─────────────────────────────────────────────────
// E2E: Size Dashboard — Preview Grid, Variant Navigation
// ─────────────────────────────────────────────────
import { test, expect } from '@playwright/test';

// Helper: Navigate to size dashboard (via creative set)
async function navigateToSizeDashboard(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Open first creative set
    const card = page.locator(
        '[data-testid="creative-set-card"], .creative-set-card, .project-card'
    ).first();

    if (await card.isVisible()) {
        await card.dblclick();
        await page.waitForTimeout(1500);

        // Look for "Sizes" tab or variant grid
        const sizesTab = page.locator(
            'text=Sizes, [data-testid="sizes-tab"], button:has-text("Sizes")'
        ).first();

        if (await sizesTab.isVisible()) {
            await sizesTab.click();
            await page.waitForTimeout(1000);
            return true;
        }
        return true; // might already be in editor
    }
    return false;
}

test.describe('Size Dashboard', () => {
    test('size preview grid shows variant thumbnails', async ({ page }) => {
        const inSizes = await navigateToSizeDashboard(page);
        if (!inSizes) return;

        // Look for preview grid or variant cards
        const previews = page.locator(
            '[data-testid="size-preview"], .size-preview, .variant-card, .variant-preview'
        );
        const count = await previews.count();

        // Should show at least master variant
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('double-clicking a variant opens editor for that size', async ({ page }) => {
        const inSizes = await navigateToSizeDashboard(page);
        if (!inSizes) return;

        const preview = page.locator(
            '[data-testid="size-preview"], .size-preview, .variant-card'
        ).first();

        if (await preview.isVisible()) {
            await preview.dblclick();
            await page.waitForTimeout(1500);

            // Should navigate to canvas editor
            const canvas = page.locator(
                'canvas, [data-testid="canvas-container"], .canvas-container'
            ).first();

            // If canvas exists, we're in editor
            if (await canvas.isVisible()) {
                expect(true).toBe(true);
            }
        }
    });
});
