import { test, expect, type Route } from '@playwright/test';

test.describe('App smoke test', () => {
  test('loads the root route without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    const handleApiRoute = async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();
      const headers = { 'content-type': 'application/json' };

      if (method !== 'GET') {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true }) });
        return;
      }

      if (url.endsWith('/api/health')) {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true }) });
        return;
      }

      if (url.includes('/api/types')) {
        await route.fulfill({ status: 200, headers, body: JSON.stringify([]) });
        return;
      }

      if (url.includes('/api/scheduled-events')) {
        await route.fulfill({ status: 200, headers, body: JSON.stringify([]) });
        return;
      }

      await route.fulfill({ status: 200, headers, body: JSON.stringify([]) });
    };

    await page.route('http://localhost:8080/api/**', handleApiRoute);
    await page.route('http://127.0.0.1:8080/api/**', handleApiRoute);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, 'No console errors should be emitted').toHaveLength(0);
  });
});

