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

test('wraps a component in a container and unwraps it', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const inspector = page.getByLabel('Inspector');
  const palette = page.getByLabel('Component palette');
  await dragTo(page, palette.getByRole('button', { name: 'Button', exact: true }), canvas);

  await page.keyboard.press('ControlOrMeta+g');
  await expect(inspector.getByRole('heading', { name: 'Flex' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveAttribute(
    'title',
    /^Undo Wrap Button in Flex/,
  );

  await inspector.getByRole('button', { name: 'Wrap or unwrap' }).click();
  await page.getByRole('menuitem', { name: /Unwrap/ }).click();
  await expect(inspector.getByRole('heading', { name: 'Button' })).toBeVisible();

  await inspector.getByRole('button', { name: 'Wrap or unwrap' }).click();
  await page.getByRole('menuitem', { name: /Wrap in Card/ }).click();
  await expect(canvas.locator('.ant-card').getByRole('button', { name: 'Button' })).toBeVisible();
});
