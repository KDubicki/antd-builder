import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('manages mock data sources in the Data panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Data' }).click();
  const panel = page.getByLabel('Mock data');
  await expect(panel.getByText('No data sources yet')).toBeVisible();

  await panel.getByRole('button', { name: /Add data source/ }).click();
  await expect(panel.getByText('List of 3 items')).toBeVisible();

  await panel.getByLabel('Name').fill('users');
  await expect(panel.getByText('users', { exact: true })).toBeVisible();
  await panel.getByLabel('Name').fill('Users');
  await expect(panel.getByText(/starting with a lowercase letter/)).toBeVisible();
  await panel.getByLabel('Name').blur();
  await expect(panel.getByLabel('Name')).toHaveValue('users');

  await panel.getByLabel('Response (JSON)').fill('{"total": 42, "page": 1}');
  await expect(panel.getByText('Object with 2 keys')).toBeVisible();

  // Undo reverts the data edit (focus outside text fields).
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(panel.getByText('List of 3 items')).toBeVisible();

  // Autosave keeps the data across reloads.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('antd-builder:project') ?? ''))
    .toContain('"Alice Johnson"');
  await page.reload();
  await page.getByRole('tab', { name: 'Data' }).click();
  await expect(panel.getByLabel('Name')).toHaveValue('users');

  await panel.getByRole('button', { name: 'Delete users' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(panel.getByText('No data sources yet')).toBeVisible();
});

test('mocks a page with API data: bind, edit the data, export', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  const inspector = page.getByLabel('Inspector');
  const data = page.getByLabel('Mock data');

  await page.getByRole('tab', { name: 'Data' }).click();
  await data.getByRole('button', { name: /Add data source/ }).click();
  await data.getByLabel('Name').fill('users');

  // A table showing the whole response.
  await dragTo(page, palette.getByRole('button', { name: 'Table', exact: true }), canvas);
  await page.getByRole('tab', { name: 'Properties' }).click();
  await inspector.getByRole('button', { name: 'Bind Rows to mock data' }).click();
  await expect(canvas.getByRole('cell', { name: 'Carol White' })).toBeVisible();

  // A text showing one field, picked from the path suggestions.
  await dragTo(page, palette.getByRole('button', { name: 'Text', exact: true }), canvas);
  await inspector.getByRole('button', { name: 'Bind Text to mock data' }).click();
  await expect(inspector.getByText('= "Alice Johnson"')).toBeVisible();
  const path = inspector.getByLabel('Text path');
  await path.fill('1.em');
  await page.getByTitle('1.email', { exact: true }).click();
  await expect(canvas.getByText('bob@example.com', { exact: true })).toBeVisible();

  // Editing the response updates every bound component.
  await page.getByRole('tab', { name: 'Data' }).click();
  await data.getByLabel('Response (JSON)').fill(
    JSON.stringify([
      { name: 'Dan', email: 'dan@example.com', key: 'd' },
      { name: 'Eve', email: 'eve@example.com', key: 'e' },
    ]),
  );
  await expect(canvas.getByRole('cell', { name: 'Dan' })).toBeVisible();
  await expect(canvas.getByText('eve@example.com', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Export code' }).click();
  const code = page.getByLabel('Generated TSX');
  await expect(code).toContainText('// Mock API responses: replace with real data fetching.');
  await expect(code).toContainText('const users = [');
  await expect(code).toContainText('dataSource={users}');
  await expect(code).toContainText('<Typography.Text>{users[1]?.email}</Typography.Text>');
});
