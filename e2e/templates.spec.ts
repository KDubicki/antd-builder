import { expect, test } from '@playwright/test';

test('starts a project from a page template', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  await page
    .getByLabel('Component palette')
    .getByRole('button', { name: 'Tag', exact: true })
    .click();

  await page.getByRole('button', { name: 'Templates' }).click();
  const gallery = page.getByRole('list', { name: 'Page templates' });
  await expect(gallery.getByRole('group', { name: 'Admin dashboard' })).toBeVisible();
  await gallery.getByRole('button', { name: 'Use Admin dashboard' }).click();

  // There is work on the page, so it asks first.
  await page.getByRole('button', { name: 'Use template' }).click();
  await expect(page.getByLabel('Project name')).toHaveValue('Admin dashboard');
  await expect(canvas.getByRole('cell', { name: 'Carol White' })).toBeVisible();
  await expect(canvas.getByText('Goals this month')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();

  // Its data came along and stays editable.
  await page.getByRole('tab', { name: 'Data' }).click();
  const data = page.getByLabel('Mock data');
  await expect(data.getByText('orders', { exact: true })).toBeVisible();
  await expect(data.getByText('stats', { exact: true })).toBeVisible();
});

test('the landing page template brings its theme and fits a phone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Landing page' }).click();
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByRole('heading', { name: 'Simple pricing' })).toBeVisible();

  // The Ocean preset came with it.
  await page.getByRole('tab', { name: 'Theme' }).click();
  await expect(
    page.getByRole('group', { name: 'Theme presets' }).getByRole('button', { name: /Ocean/ }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByText('Mobile', { exact: true }).click();
  const edge = await canvas.boundingBox();
  for (const card of await canvas.locator('.ant-card').all()) {
    const box = (await card.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(edge!.x + edge!.width + 1);
  }
});

test('account templates centre their form, full width on phones', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Sign-in page' }).click();
  const canvas = page.getByTestId('canvas');
  const card = canvas.locator('.ant-card');
  await expect(card.getByRole('button', { name: 'Sign in' })).toBeVisible();

  const widthShare = async () => {
    const outer = (await canvas.boundingBox())!;
    const inner = (await card.boundingBox())!;
    return inner.width / outer.width;
  };
  expect(await widthShare()).toBeLessThan(0.7);
  await page.getByText('Mobile', { exact: true }).click();
  await expect.poll(widthShare).toBeGreaterThan(0.8);
});

test('the customer list exports with its data declared', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Customer list' }).click();
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByRole('cell', { name: 'Frank Moore' })).toBeVisible();

  await page.getByRole('button', { name: 'Export code' }).click();
  const code = page.getByLabel('Generated TSX');
  await expect(code).toContainText('const customers = [');
  await expect(code).toContainText('dataSource={customers}');
  await expect(code).toContainText('<Input.Search');
});

test('the settings template binds billing details to editable data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Account settings' }).click();
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByText('8 of 10 used')).toBeVisible();

  await page.getByRole('tab', { name: 'Data' }).click();
  await page
    .getByLabel('Mock data')
    .getByLabel('Response (JSON)')
    .fill(JSON.stringify([{ key: 'plan', label: 'Plan', children: 'Business (yearly)' }]));
  await expect(canvas.getByText('Business (yearly)')).toBeVisible();
  await expect(canvas.getByText('8 of 10 used')).toHaveCount(0);
});

test('the product page loads its pictures without the network', async ({ page }) => {
  const blocked: string[] = [];
  page.on('requestfailed', (request) => blocked.push(request.url()));
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Product page' }).click();
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByRole('heading', { name: 'Cloud Runner 3' })).toBeVisible();
  await expect(canvas.getByRole('img', { name: 'Cloud Runner 3, side view' })).toBeVisible();
  await expect(canvas.getByText('Trail Runner GTX')).toBeVisible();
  expect(blocked).toEqual([]);
});

test('the blog article keeps a readable column on desktop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Blog article' }).click();
  const canvas = page.getByTestId('canvas');
  const title = canvas.getByRole('heading', { name: /How we rebuilt our admin panel/ });
  await expect(title).toBeVisible();
  await expect(canvas.getByText(/saved us a sprint/)).toBeVisible();

  const column = (await title.boundingBox())!;
  const page_ = (await canvas.boundingBox())!;
  expect(column.width).toBeLessThan(page_.width * 0.8);
});
