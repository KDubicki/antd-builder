import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const project = {
  version: 1,
  name: 'Signup',
  theme: { mode: 'light', compact: false, token: { colorPrimary: '#722ed1' } },
  pages: [
    {
      id: 'home',
      name: 'Home',
      root: {
        id: 'root',
        component: 'Flex',
        props: { vertical: true, gap: 'middle' },
        children: [
          {
            id: 'form',
            component: 'Form',
            props: { layout: 'vertical' },
            children: [
              {
                id: 'email',
                component: 'Form.Item',
                props: { label: 'Email' },
                children: [
                  {
                    id: 'input',
                    component: 'Input',
                    props: { placeholder: 'you@example.com' },
                    children: [],
                  },
                ],
              },
              {
                id: 'submit',
                component: 'Button',
                props: { children: 'Sign up', type: 'primary' },
                children: [],
              },
            ],
          },
        ],
      },
    },
  ],
  customComponents: [],
  mockData: [{ id: 'users-id', name: 'users', data: [{ key: '1', name: 'Ann' }] }],
};

test('opens a project file and saves it back', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('project-file-input').setInputFiles({
    name: 'signup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });

  const canvas = page.getByTestId('canvas');
  await expect(page.getByText('Opened "Signup"')).toBeVisible();
  await expect(page.getByLabel('Project name')).toHaveValue('Signup');
  await expect(canvas.getByPlaceholder('you@example.com')).toBeVisible();
  // The project theme came with the file.
  await expect(canvas.getByRole('button', { name: 'Sign up' })).toHaveCSS(
    'background-color',
    'rgb(114, 46, 209)',
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('signup.json');
  expect(JSON.parse(await readFile(await download.path(), 'utf8'))).toEqual(project);
});

test('rejects an invalid project file', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('project-file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...project, version: 99 })),
  });
  await expect(page.getByText(/Invalid project file: version/)).toBeVisible();
  await expect(page.getByLabel('Project name')).toHaveValue('Untitled project');
});

test('keeps the project across reloads', async ({ page }) => {
  // Restoring happens after hydration, so it must not cause hydration mismatches.
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByLabel('Project name').fill('Persistent');
  await page.getByRole('tab', { name: 'Theme' }).click();
  await page.getByLabel('Theme editor').getByText('Dark').click();

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('antd-builder:project')))
    .toContain('"Persistent"');
  await page.reload();

  await expect(page.getByLabel('Project name')).toHaveValue('Persistent');
  await expect(page.getByTestId('canvas')).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  expect(errors).toEqual([]);
});
