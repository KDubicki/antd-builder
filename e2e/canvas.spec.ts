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
