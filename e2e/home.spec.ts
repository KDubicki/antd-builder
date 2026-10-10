import { expect, test } from '@playwright/test';

test('editor shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('antd-builder');
  await expect(page.getByText('antd-builder', { exact: true })).toBeVisible();
});

test('pages are served with a nonce-based CSP that does not break the app', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content.Security.Policy/i.test(message.text())) violations.push(message.text());
  });

  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);

  // antd's CSS-in-JS styles applied: the layout header is not transparent.
  const header = page.locator('.ant-layout-header');
  await expect(header).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.waitForLoadState('networkidle');
  expect(violations).toEqual([]);
});

test('unknown routes show the not-found page', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Page not found')).toBeVisible();
});

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok' });
});
