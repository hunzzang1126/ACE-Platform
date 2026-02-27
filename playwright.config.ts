import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 15_000,
    retries: 0,
    reporter: [['list'], ['json', { outputFile: 'e2e/results.json' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    /* No webServer block — expects `npm run dev` to be running already */
    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
    ],
});
