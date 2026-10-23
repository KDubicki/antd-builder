import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

test('selects nested components from the layers panel', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  await dragTo(page, palette.getByText('Card', { exact: true }), canvas);
  await dragTo(
    page,
    palette.getByText('Button', { exact: true }),
    canvas.locator('.ant-card').getByText('Drop components here'),
  );

  await page.getByRole('tab', { name: 'Layers' }).click();
  const layers = page.getByLabel('Layers');
  await expect(layers.getByText('Page')).toBeVisible();
  await expect(layers.getByText('Card title')).toBeVisible(); // the card's hint

  // Picking a layer selects that node for the inspector.
  await layers.getByText('Card', { exact: true }).click();
  const inspector = page.getByLabel('Inspector');
  await expect(inspector.getByRole('heading', { name: 'Card' })).toBeVisible();
  await expect(layers.locator('.ant-tree-treenode-selected')).toContainText('Card');

  // Collapsing hides the children; expanding brings them back.
  const cardLayer = layers.locator('.ant-tree-treenode', { hasText: 'Card title' });
  await cardLayer.locator('.ant-tree-switcher').click();
  await expect(layers.getByText('Button', { exact: true })).toHaveCount(0);
  await cardLayer.locator('.ant-tree-switcher').click();
  await expect(layers.getByText('Button', { exact: true })).toBeVisible();

  await layers.getByText('Button', { exact: true }).click();
  await expect(inspector.getByRole('heading', { name: 'Button' })).toBeVisible();

  // Edits show up in the outline.
  await inspector.getByLabel('Label').fill('Submit');
  await expect(layers.getByText('Submit')).toBeVisible();

  // The filter keeps matches and the layers leading to them.
  await layers.getByLabel('Filter layers').fill('submit');
  await expect(layers.getByText('Card', { exact: true })).toBeVisible();
  await expect(layers.getByText('Submit')).toBeVisible();
  await layers.getByLabel('Filter layers').fill('nothing like this');
  await expect(layers.getByText('No layers match')).toBeVisible();
});

test('right-clicking a layer opens its commands', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  await dragTo(page, palette.getByText('Tag', { exact: true }), canvas);

  await page.getByRole('tab', { name: 'Layers' }).click();
  const layers = page.getByLabel('Layers');
  await layers.getByText('Tag', { exact: true }).click({ button: 'right' });
  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: /Duplicate/ })
    .click();
  await expect(layers.getByText('Tag', { exact: true })).toHaveCount(2);
  await expect(canvas.locator('.ant-tag')).toHaveCount(2);
});

test('picking a layer scrolls its component into view', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  for (let i = 0; i < 8; i += 1) {
    await palette.getByRole('button', { name: 'Card', exact: true }).click();
    await page.keyboard.press('Escape'); // add the next one to the page, not inside this card
  }
  const cards = canvas.locator('.ant-card');
  await expect(cards).toHaveCount(8);
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.first()).not.toBeInViewport();

  await page.getByRole('tab', { name: 'Layers' }).click();
  await page.getByLabel('Layers').getByText('Card', { exact: true }).first().click();
  await expect(cards.first()).toBeInViewport();
});
