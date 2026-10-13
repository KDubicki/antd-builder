import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('shows the shortcut reference without touching the page behind it', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const palette = page.getByLabel('Component palette');
  await dragTo(page, palette.getByRole('button', { name: 'Button', exact: true }), canvas);
  const button = canvas.getByRole('button', { name: 'Button' });
  await expect(button).toBeVisible();

  await page.keyboard.press('Shift+?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Move the selected component up')).toBeVisible();

  // Keys pressed in the dialog don't edit the page, and Escape keeps the selection.
  await page.keyboard.press('Delete');
  await expect(button).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Inspector').getByRole('heading', { name: 'Button' })).toBeVisible();

  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
  await expect(dialog).toBeVisible();
});
