import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('drops ready-made blocks, with their mock data', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  await dragTo(page, palette.getByRole('button', { name: 'Sign-in form' }), canvas);
  await expect(canvas.getByPlaceholder('you@example.com')).toBeVisible();
  await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await dragTo(page, palette.getByRole('button', { name: 'User table' }), canvas);
  await expect(canvas.getByRole('cell', { name: 'Carol White' })).toBeVisible();

  // The block brought its data source; editing it updates the table.
  await page.getByRole('tab', { name: 'Data' }).click();
  const data = page.getByLabel('Mock data');
  await expect(data.getByLabel('Name')).toHaveValue('users');
  await data
    .getByLabel('Response (JSON)')
    .fill(JSON.stringify([{ name: 'Zed', email: 'z@example.com', role: 'Owner', key: 'z' }]));
  await expect(canvas.getByRole('cell', { name: 'Zed' })).toBeVisible();

  // One undo removes the edit; the next removes the block and its data.
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(canvas.locator('.ant-table')).toHaveCount(0);
  await expect(data.getByText('No data sources yet')).toBeVisible();
});
