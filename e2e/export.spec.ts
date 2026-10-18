import { execFileSync } from 'node:child_process';
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

test('downloads a runnable Next.js project with the mock data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Project name').fill('Team list');
  await dragTo(
    page,
    page.getByLabel('Component palette').getByRole('button', { name: 'User table' }),
    page.getByTestId('canvas'),
  );

  await page.getByRole('button', { name: 'Export code' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download Next.js project/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('team-list.zip');

  // Read with the system unzip, to be sure other tools open the archive.
  const zip = await download.path();
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
  expect(entries.sort()).toEqual(
    [
      '.gitignore',
      'README.md',
      'app/api/users/route.ts',
      'app/layout.tsx',
      'app/page.tsx',
      'data/users.json',
      'next.config.ts',
      'package.json',
      'tsconfig.json',
    ].map((name) => `team-list/${name}`),
  );
  const pageSource = execFileSync('unzip', ['-p', zip, 'team-list/app/page.tsx'], {
    encoding: 'utf8',
  });
  expect(pageSource).toContain("import users from '@/data/users.json';");
  const data = execFileSync('unzip', ['-p', zip, 'team-list/data/users.json'], {
    encoding: 'utf8',
  });
  expect(JSON.parse(data)).toEqual(expect.arrayContaining([expect.objectContaining({ key: '1' })]));
});
