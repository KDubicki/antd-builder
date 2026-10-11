import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('exports the page as TSX', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project name').fill('Landing page');

  // Build: Card > Button, then customise the button and the theme.
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  await dragTo(page, palette.getByText('Card', { exact: true }), canvas);
  await dragTo(
    page,
    palette.getByText('Button', { exact: true }),
    canvas.getByText('Drop components here'),
  );
  await page.getByLabel('Inspector').getByLabel('Label').fill('Get started');
  await page.getByRole('tab', { name: 'Theme' }).click();
  await page.getByLabel('Theme editor').getByText('Dark').click();

  await page.getByRole('button', { name: 'Export code' }).click();
  const code = page.getByLabel('Generated TSX');
  await expect(code).toContainText('export default function LandingPage()');
  await expect(code).toContainText('algorithm: [theme.darkAlgorithm]');
  await expect(code).toContainText('<Button type="primary">Get started</Button>');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download landing-page.tsx' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('landing-page.tsx');
  expect(await readFile(await download.path(), 'utf8')).toBe(await code.textContent());
});
