import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('shares a read-only copy that others can open in their editor', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByLabel('Project name').fill('Landing page');
  const canvas = page.getByTestId('canvas');
  await dragTo(
    page,
    page.getByLabel('Component palette').getByRole('button', { name: 'Card', exact: true }),
    canvas,
  );
  await page.getByRole('button', { name: 'Version history' }).click();
  await page.getByRole('button', { name: 'Save version' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Share' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share a read-only copy' });
  const link = await dialog.getByLabel('Share link').inputValue();
  expect(link).toMatch(/\/s\/[A-Za-z0-9_-]{22}$/);

  // Someone else, in their own browser, sees the page without editing controls.
  const viewer = await (await browser.newContext()).newPage();
  await viewer.goto(link);
  await expect(viewer.getByText('Landing page')).toBeVisible();
  await expect(viewer.getByText('Read-only')).toBeVisible();
  const shared = viewer.getByTestId('canvas');
  await expect(shared).toHaveAttribute('data-preview', 'true');
  await expect(shared.locator('.ant-card')).toBeVisible();
  await expect(viewer.getByLabel('Component palette')).toHaveCount(0);
  await viewer.getByText('Mobile', { exact: true }).click();
  await expect(shared).toHaveAttribute('data-viewport', 'mobile');

  // With no project of their own, it opens straight in their editor, without the versions.
  await viewer.getByRole('button', { name: 'Open in editor' }).click();
  await expect(viewer).toHaveURL(/\/$/);
  await expect(viewer.getByLabel('Project name')).toHaveValue('Landing page');
  await expect(viewer.getByTestId('canvas').locator('.ant-card')).toBeVisible();
  await expect(viewer.getByLabel('Component palette')).toBeVisible();
  await viewer.getByRole('button', { name: 'Version history' }).click();
  await expect(viewer.getByText('No versions yet')).toBeVisible();

  // The author has a project in this browser, so opening asks before replacing it.
  await page.goto(link);
  await page.getByRole('button', { name: 'Open in editor' }).click();
  await expect(page.getByRole('dialog', { name: 'Replace your project?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(link);
});

test('unknown share links show the not-found page', async ({ page }) => {
  const response = await page.goto(`/s/${'A'.repeat(22)}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Page not found')).toBeVisible();
});
