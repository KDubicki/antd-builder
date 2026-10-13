import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('searches the palette and drags a match onto the canvas', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  const search = palette.getByLabel('Search components');

  await search.fill('rate');
  await expect(palette.getByRole('button', { name: 'Rate', exact: true })).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Button', exact: true })).toHaveCount(0);

  await dragTo(page, palette.getByRole('button', { name: 'Rate', exact: true }), canvas);
  await expect(canvas.locator('.ant-rate')).toBeVisible();

  await search.fill('no such component');
  await expect(palette.getByText('No components match')).toBeVisible();

  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(palette.getByRole('button', { name: 'Button', exact: true })).toBeVisible();
});
