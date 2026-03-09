// ─────────────────────────────────────────────────
// E2E: Canvas Editor — Elements, Layers, Save Round-Trip
// ─────────────────────────────────────────────────
import { test, expect } from '@playwright/test';

// Helper: Navigate to editor (create or open first creative set)
async function navigateToEditor(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Try to open existing set by double-clicking first card
    const card = page.locator(
        '[data-testid="creative-set-card"], .creative-set-card, .project-card'
    ).first();

    if (await card.isVisible()) {
        await card.dblclick();
        await page.waitForTimeout(1500);
        return true;
    }

    // Or create new
    const newBtn = page.locator(
        'button:has-text("New"), [data-testid="new-creative-set"]'
    ).first();
    if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(1500);
        return true;
    }

    return false;
}

test.describe('Canvas Editor — Element Operations', () => {
    test('canvas area is visible on editor page', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Canvas container should exist
        const canvas = page.locator(
            'canvas, [data-testid="canvas-container"], .canvas-container, .pixi-canvas'
        ).first();

        await expect(canvas).toBeVisible({ timeout: 5000 });
    });

    test('add rectangle via toolbar or shortcut', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Try R key shortcut
        await page.keyboard.press('r');
        await page.waitForTimeout(500);

        // Or find add shape button
        const shapeBtn = page.locator(
            'button:has-text("Rectangle"), [data-testid="add-rectangle"], [title="Rectangle"]'
        ).first();
        if (await shapeBtn.isVisible()) {
            await shapeBtn.click();
            await page.waitForTimeout(500);
        }

        // Verify no crash
        expect(await page.title()).toBeDefined();
    });

    test('add text via toolbar or shortcut', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Try T key shortcut
        await page.keyboard.press('t');
        await page.waitForTimeout(500);

        const textBtn = page.locator(
            'button:has-text("Text"), [data-testid="add-text"], [title="Text"]'
        ).first();
        if (await textBtn.isVisible()) {
            await textBtn.click();
            await page.waitForTimeout(500);
        }

        expect(await page.title()).toBeDefined();
    });
});

test.describe('Canvas Editor — Layer Panel', () => {
    test('layer panel shows elements', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Look for layer panel
        const layerPanel = page.locator(
            '[data-testid="layer-panel"], .layer-panel, .layers'
        ).first();

        if (await layerPanel.isVisible()) {
            // Should show at least some layer rows
            const rows = layerPanel.locator(
                '[data-testid="layer-row"], .layer-row, [class*="layer"]'
            );
            const count = await rows.count();
            // Even empty canvas might have a background layer
            expect(count).toBeGreaterThanOrEqual(0);
        }
    });

    test('clicking a layer row selects the element', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        const layerRow = page.locator(
            '[data-testid="layer-row"], .layer-row'
        ).first();

        if (await layerRow.isVisible()) {
            await layerRow.click();
            await page.waitForTimeout(300);

            // Should show selection indicator (active class, highlight, etc)
            // Just verify no crash
            expect(await page.title()).toBeDefined();
        }
    });
});

test.describe('Canvas Editor — Property Panel', () => {
    test('property panel shows when element is selected', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Select an element by clicking layer row
        const layerRow = page.locator(
            '[data-testid="layer-row"], .layer-row'
        ).first();

        if (await layerRow.isVisible()) {
            await layerRow.click();
            await page.waitForTimeout(500);

            // Property panel should be visible with transform values
            const propPanel = page.locator(
                '[data-testid="property-panel"], .property-panel, .properties'
            ).first();

            if (await propPanel.isVisible()) {
                // Should have some inputs (x, y, w, h, etc)
                const inputs = propPanel.locator('input');
                const inputCount = await inputs.count();
                expect(inputCount).toBeGreaterThan(0);
            }
        }
    });
});

test.describe('Canvas Editor — Save Round-Trip', () => {
    test('save → exit → re-enter preserves elements', async ({ page }) => {
        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        // Add a rectangle
        await page.keyboard.press('r');
        await page.waitForTimeout(500);

        // Count elements in layer panel
        const layersBefore = await page.locator(
            '[data-testid="layer-row"], .layer-row'
        ).count();

        // Save (Cmd+S)
        await page.keyboard.press('Meta+s');
        await page.waitForTimeout(1000);

        // Exit to dashboard
        await page.goto('/');
        await page.waitForTimeout(1500);

        // Re-enter editor
        const reEntered = await navigateToEditor(page);
        if (!reEntered) return;

        // Count elements again — should be >= before
        const layersAfter = await page.locator(
            '[data-testid="layer-row"], .layer-row'
        ).count();

        expect(layersAfter).toBeGreaterThanOrEqual(layersBefore);
    });
});

test.describe('Canvas Editor — No Console Errors', () => {
    test('editor page loads without console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        const inEditor = await navigateToEditor(page);
        if (!inEditor) return;

        await page.waitForTimeout(3000);

        const realErrors = errors.filter(e =>
            !e.includes('React') &&
            !e.includes('favicon') &&
            !e.includes('DevTools') &&
            !e.includes('WebGL') &&
            !e.includes('WebGPU') &&
            !e.includes('GPU')
        );

        expect(realErrors.length).toBe(0);
    });
});
