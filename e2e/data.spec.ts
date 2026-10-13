import { expect, test } from '@playwright/test';

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
