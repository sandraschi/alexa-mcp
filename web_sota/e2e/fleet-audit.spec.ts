import { test, expect } from '@playwright/test';

const BE = 'http://127.0.0.1:10801';
const FE = 'http://127.0.0.1:10800';

test.describe('Fleet Audit', () => {
    test('Backend health', async ({ request }) => {
        const resp = await request.get(`${BE}/api/health`);
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        expect(body.status).toBe('ok');
    });

    test('Backend status', async ({ request }) => {
        const resp = await request.get(`${BE}/api/status`);
        expect(resp.status()).toBe(200);
    });

    test('Backend diagnostics', async ({ request }) => {
        const resp = await request.get(`${BE}/api/v1/diagnostics`);
        expect(resp.status()).toBe(200);
    });

    test('Frontend loads', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('#root')).toBeAttached();
    });

    test('Dashboard has KPIs', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('[data-testid="dashboard"]')).toBeAttached();
        await expect(page.locator('[data-testid="kpi-server"]')).toBeAttached();
        await expect(page.locator('[data-testid="backend-dot"]')).toBeAttached();
    });
});
