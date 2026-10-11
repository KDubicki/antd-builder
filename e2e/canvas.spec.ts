import { type Locator, type Page, expect, test } from '@playwright/test';

/** Drags with real pointer moves so dnd-kit's pointer sensor activates. */
async function dragTo(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target is not visible');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
}

test('builds a nested page by dragging from the palette', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  await dragTo(page, palette.getByText('Card', { exact: true }), canvas);
  const card = canvas.locator('.ant-card');
  await expect(card).toContainText('Card title');

  // Dropping onto the card's empty body nests the button inside the card.
  await dragTo(
    page,
    palette.getByText('Button', { exact: true }),
    card.getByText('Drop components here'),
  );
  await expect(card.getByRole('button', { name: 'Button' })).toBeVisible();

  // The last dropped node is selected; Delete removes it.
  await page.keyboard.press('Delete');
  await expect(card.getByRole('button', { name: 'Button' })).toHaveCount(0);

  // Selecting the card and deleting it empties the canvas again.
  await card.getByText('Card title').click();
  await page.keyboard.press('Delete');
  await expect(canvas.locator('.ant-card')).toHaveCount(0);
});

test('enforces nesting rules on drop', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  // A grid column can only live inside a row, so dropping it on the page does nothing.
  await dragTo(page, palette.getByText('Grid column', { exact: true }), canvas);
  await expect(canvas.locator('.ant-col')).toHaveCount(0);

  await dragTo(page, palette.getByText('Grid row', { exact: true }), canvas);
  await dragTo(
    page,
    palette.getByText('Grid column', { exact: true }),
    canvas.locator('.ant-row').getByText('Drop components here'),
  );
  const col = canvas.locator('.ant-row .ant-col');
  await expect(col).toHaveCount(1);

  // The canvas wrappers don't break grid layout: a span-12 column takes half the row.
  const rowBox = await canvas.locator('.ant-row').boundingBox();
  const colBox = await col.boundingBox();
  expect(colBox!.width / rowBox!.width).toBeCloseTo(0.5, 1);
});

test('edits the selected component in the inspector', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  const inspector = page.getByLabel('Inspector');

  await expect(page.getByText(/Select a component on the canvas/)).toBeVisible();

  // A freshly dropped node is selected, so the inspector shows its props right away.
  await dragTo(page, palette.getByText('Button', { exact: true }), canvas);
  await expect(inspector.getByRole('heading', { name: 'Button' })).toBeVisible();

  await inspector.getByLabel('Label').fill('Save changes');
  const button = canvas.getByRole('button', { name: 'Save changes' });
  await expect(button).toBeVisible();

  await inspector.getByLabel('Danger').click();
  await expect(button).toHaveClass(/ant-btn-dangerous/);

  await inspector.getByLabel('Type').click();
  await page.getByTitle('dashed').click();
  await expect(button).toHaveClass(/ant-btn-dashed/);

  await inspector.getByRole('button', { name: 'Delete component' }).click();
  await expect(button).toHaveCount(0);
});

test('previews theme changes live on the canvas only', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  await dragTo(
    page,
    page.getByLabel('Component palette').getByText('Button', { exact: true }),
    canvas,
  );
  const button = canvas.getByRole('button', { name: 'Button' });
  await expect(button).toHaveCSS('background-color', 'rgb(22, 119, 255)');

  await page.getByRole('tab', { name: 'Theme' }).click();
  const themeEditor = page.getByLabel('Theme editor');
  await themeEditor.getByText('Dark').click();
  await expect(canvas).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  // The editor chrome keeps its own (light) theme.
  await expect(page.locator('.ant-layout-sider').first()).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );

  await themeEditor.getByLabel('Border radius').fill('0');
  await expect(button).toHaveCSS('border-radius', '0px');

  await themeEditor.getByRole('button', { name: 'Reset theme' }).click();
  await expect(canvas).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
