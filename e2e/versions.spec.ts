import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('saves a version and restores it, undoably', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  await dragTo(page, palette.getByRole('button', { name: 'Card', exact: true }), canvas);

  await page.getByRole('button', { name: 'Version history' }).click();
  const panel = page.getByRole('dialog', { name: 'Version history' });
  await panel.getByLabel('Version name').fill('Just a card');
  await panel.getByRole('button', { name: 'Save version' }).click();
  await expect(panel.getByText('Just a card')).toBeVisible();

  // Versions can be renamed in place.
  await panel.getByRole('button', { name: 'Rename Just a card' }).click();
  await panel.getByLabel('Saved versions').getByRole('textbox').fill('One card');
  await panel.getByLabel('Saved versions').getByRole('textbox').press('Enter');
  await expect(panel.getByText('One card')).toBeVisible();
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();

  // Change the page, then go back to the saved version.
  await dragTo(page, palette.getByRole('button', { name: 'Tag', exact: true }), canvas);
  await expect(canvas.locator('.ant-tag')).toBeVisible();
  await page.getByRole('button', { name: 'Version history' }).click();
  await panel.getByRole('button', { name: 'Restore One card' }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByText('Restored "One card"')).toBeVisible();
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
  await expect(canvas.locator('.ant-tag')).toHaveCount(0);
  await expect(canvas.locator('.ant-card')).toBeVisible();

  // Restoring is one undo step.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(canvas.locator('.ant-tag')).toBeVisible();

  // Versions are saved with the project.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('antd-builder:project') ?? ''))
    .toContain('"One card"');
  await page.reload();
  await page.getByRole('button', { name: 'Version history' }).click();
  await expect(panel.getByText('One card')).toBeVisible();
});

test('saves a version with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('canvas').click();
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByText('Saved "Version 1"')).toBeVisible();
  await page.getByRole('button', { name: 'Version history' }).click();
  await expect(page.getByLabel('Saved versions').getByText('Version 1')).toBeVisible();

  // Also while typing a version name, instead of the browser's "Save page" dialog.
  await page.getByLabel('Version name').press('ControlOrMeta+s');
  await expect(page.getByLabel('Saved versions').getByText('Version 2')).toBeVisible();
});
