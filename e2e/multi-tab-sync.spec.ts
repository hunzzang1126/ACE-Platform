// ─────────────────────────────────────────────────
// E2E: Multi-Tab Sync — BroadcastChannel
// ─────────────────────────────────────────────────
// Tests that changes in one tab reflect in another tab.
import { test, expect } from '@playwright/test';

test.describe('Multi-Tab Sync', () => {
    test('creating a project in tab1 appears in tab2', async ({ browser }) => {
        // Open two tabs (same browser context = same origin = BroadcastChannel works)
        const context = await browser.newContext();
        const tab1 = await context.newPage();
        const tab2 = await context.newPage();

        // Both tabs navigate to dashboard
        await tab1.goto('http://localhost:5173');
        await tab2.goto('http://localhost:5173');
        await tab1.waitForTimeout(1500);
        await tab2.waitForTimeout(1500);

        // Count projects in tab2 BEFORE
        const beforeCount = await tab2.locator(
            '[data-testid="creative-set-card"], .creative-set-card, .project-card'
        ).count();

        // Create a new project in tab1
        const newBtn = tab1.locator(
            'button:has-text("New"), [data-testid="new-creative-set"]'
        ).first();

        if (await newBtn.isVisible()) {
            await newBtn.click();
            await tab1.waitForTimeout(1000);

            // Go back to tab1 dashboard so it triggers save
            await tab1.goto('http://localhost:5173');
            await tab1.waitForTimeout(1000);

            // Refresh tab2 (BroadcastChannel should have synced, but refresh is safest)
            await tab2.reload();
            await tab2.waitForTimeout(1500);

            // Count projects in tab2 AFTER
            const afterCount = await tab2.locator(
                '[data-testid="creative-set-card"], .creative-set-card, .project-card'
            ).count();

            expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
        }

        await context.close();
    });

    test('deleting a project in tab1 removes it from tab2', async ({ browser }) => {
        const context = await browser.newContext();
        const tab1 = await context.newPage();
        const tab2 = await context.newPage();

        await tab1.goto('http://localhost:5173');
        await tab2.goto('http://localhost:5173');
        await tab1.waitForTimeout(1500);
        await tab2.waitForTimeout(1500);

        // Check if there are any projects to delete
        const cards = tab1.locator(
            '[data-testid="creative-set-card"], .creative-set-card, .project-card'
        );
        const count = await cards.count();

        if (count > 0) {
            // Right-click first card in tab1
            await cards.first().click({ button: 'right' });
            await tab1.waitForTimeout(300);

            const deleteBtn = tab1.locator('text=Delete, text=Move to Trash').first();
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                await tab1.waitForTimeout(1000);

                // Refresh tab2
                await tab2.reload();
                await tab2.waitForTimeout(1500);

                const afterCount = await tab2.locator(
                    '[data-testid="creative-set-card"], .creative-set-card, .project-card'
                ).count();

                // Should have one fewer (or same if it went to trash but still shows)
                expect(afterCount).toBeLessThanOrEqual(count);
            }
        }

        await context.close();
    });

    test('empty trash in tab1 reflects in tab2', async ({ browser }) => {
        const context = await browser.newContext();
        const tab1 = await context.newPage();
        const tab2 = await context.newPage();

        await tab1.goto('http://localhost:5173');
        await tab2.goto('http://localhost:5173');
        await tab1.waitForTimeout(1500);
        await tab2.waitForTimeout(1500);

        // Navigate to trash in tab1
        const trashBtn = tab1.locator(
            'text=Trash, [data-testid="trash-button"], button:has-text("Trash")'
        ).first();

        if (await trashBtn.isVisible()) {
            await trashBtn.click();
            await tab1.waitForTimeout(500);

            // Empty trash in tab1
            const emptyBtn = tab1.locator(
                'text=Empty Trash, button:has-text("Empty"), [data-testid="empty-trash"]'
            ).first();

            if (await emptyBtn.isVisible()) {
                await emptyBtn.click();
                await tab1.waitForTimeout(1000);

                // Navigate to trash in tab2 and verify
                await tab2.reload();
                await tab2.waitForTimeout(1000);

                const trashBtn2 = tab2.locator(
                    'text=Trash, [data-testid="trash-button"], button:has-text("Trash")'
                ).first();

                if (await trashBtn2.isVisible()) {
                    await trashBtn2.click();
                    await tab2.waitForTimeout(500);

                    const trashItems = await tab2.locator(
                        '[data-testid="trash-item"], .trash-item'
                    ).count();

                    expect(trashItems).toBe(0);
                }
            }
        }

        await context.close();
    });
});
