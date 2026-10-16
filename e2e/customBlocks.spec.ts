import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('saves a fragment as a block and reuses it', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  const inspector = page.getByLabel('Inspector');

  await dragTo(page, palette.getByRole('button', { name: 'Card', exact: true }), canvas);
  await dragTo(
    page,
    palette.getByRole('button', { name: 'Button', exact: true }),
    canvas.getByText('Drop components here'),
  );
  await inspector.getByLabel('Label').fill('Buy now');
  await canvas.getByText('Card title').click();

  await inspector.getByRole('button', { name: 'Save as block' }).click();
  await page.getByLabel('Block name').fill('Promo card');
  await page.getByLabel('Block name').press('Enter');
  await expect(page.getByText('Saved to My blocks in the palette')).toBeVisible();

  const saved = palette.getByRole('button', { name: 'Promo card', exact: true });
  await expect(saved).toBeVisible();
  await dragTo(page, saved, canvas);
  await expect(canvas.getByRole('button', { name: 'Buy now' })).toHaveCount(2);

  // Saved blocks survive a reload with the project.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('antd-builder:project') ?? ''))
    .toContain('"Promo card"');
  await page.reload();
  await expect(palette.getByRole('button', { name: 'Promo card', exact: true })).toBeVisible();
});
