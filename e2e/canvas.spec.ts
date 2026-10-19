import { expect, test } from '@playwright/test';
import { dragTo } from './helpers';

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

test('duplicates the selected component with its children', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  await dragTo(page, palette.getByText('Card', { exact: true }), canvas);
  await dragTo(
    page,
    palette.getByText('Button', { exact: true }),
    canvas.locator('.ant-card').getByText('Drop components here'),
  );

  await canvas.getByText('Card title').click();
  await page.getByLabel('Inspector').getByRole('button', { name: 'Duplicate component' }).click();
  await expect(canvas.locator('.ant-card')).toHaveCount(2);
  await expect(canvas.locator('.ant-card').nth(1).getByRole('button')).toHaveText('Button');

  // The copy is selected, so the shortcut copies it again.
  await page.keyboard.press('ControlOrMeta+d');
  await expect(canvas.locator('.ant-card')).toHaveCount(3);
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

test('undoes and redoes edits', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const undo = page.getByRole('button', { name: 'Undo' });
  const redo = page.getByRole('button', { name: 'Redo' });
  await expect(undo).toBeDisabled();

  await dragTo(
    page,
    page.getByLabel('Component palette').getByText('Button', { exact: true }),
    canvas,
  );
  // Typing a label is a single undo step.
  await page.getByLabel('Inspector').getByLabel('Label').pressSequentially('Save');
  await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();

  await undo.click();
  await expect(canvas.getByRole('button', { name: 'Button' })).toBeVisible();
  await undo.click();
  await expect(canvas.getByRole('button')).toHaveCount(0);
  await expect(undo).toBeDisabled();

  await redo.click();
  await expect(canvas.getByRole('button', { name: 'Button' })).toBeVisible();
  await canvas.click({ position: { x: 5, y: 5 } }); // move focus out of the header
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(canvas.getByRole('button', { name: 'Button' })).toBeVisible();
});

test('copies, cuts and pastes components', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');

  await dragTo(page, palette.getByText('Button', { exact: true }), canvas);
  await dragTo(page, palette.getByText('Card', { exact: true }), canvas);
  const buttons = canvas.getByRole('button', { name: 'Button' });
  const cardButtons = canvas.locator('.ant-card').getByRole('button');

  // Copy the button, then paste into the selected card.
  await buttons.first().click();
  await page.keyboard.press('ControlOrMeta+c');
  await canvas.getByText('Card title').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cardButtons).toHaveCount(1);
  await expect(buttons).toHaveCount(2);

  // Cutting the card removes it with its contents; pasting brings it back after the selection.
  await canvas.getByText('Card title').click();
  await page.keyboard.press('ControlOrMeta+x');
  await expect(canvas.locator('.ant-card')).toHaveCount(0);
  await buttons.first().click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cardButtons).toHaveCount(1);
});

test('reorders the selected component with Alt+Arrow keys and the inspector', async ({ page }) => {
  await page.goto('/');
  const palette = page.getByLabel('Component palette');
  const canvas = page.getByTestId('canvas');
  const button = canvas.locator('.ant-btn');
  const tag = canvas.locator('.ant-tag');
  const tagIsFirst = async () => (await tag.boundingBox())!.y < (await button.boundingBox())!.y;

  await dragTo(page, palette.getByRole('button', { name: 'Button', exact: true }), canvas);
  await dragTo(page, palette.getByRole('button', { name: 'Tag', exact: true }), canvas);
  await expect(tag).toBeVisible();
  expect(await tagIsFirst()).toBe(false);

  // The dropped Tag is selected; Alt+↑ moves it above the button.
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(tagIsFirst).toBe(true);

  const inspector = page.getByLabel('Inspector');
  await expect(inspector.getByRole('button', { name: 'Move up' })).toBeDisabled();
  await inspector.getByRole('button', { name: 'Move down' }).click();
  await expect.poll(tagIsFirst).toBe(false);
});

test('previews the page at tablet and mobile widths', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const width = async () => (await canvas.boundingBox())!.width;
  const desktop = await width();

  await page.getByText('Tablet', { exact: true }).click();
  await expect.poll(width).toBe(768);
  await page.getByText('Mobile', { exact: true }).click();
  await expect.poll(width).toBe(375);

  // Dropping still works on the narrow canvas.
  await dragTo(page, page.getByRole('button', { name: 'Button', exact: true }), canvas);
  await expect(canvas.getByRole('button', { name: 'Button' })).toBeVisible();

  await page.getByText('Desktop', { exact: true }).click();
  await expect.poll(width).toBe(desktop);
});

test('previews the page as users see it', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  await dragTo(page, page.getByRole('button', { name: 'Card', exact: true }), canvas);
  await expect(canvas.getByText('Drop components here')).toBeVisible();

  await page.getByRole('button', { name: /Preview/ }).click();
  await expect(page.getByLabel('Component palette')).toBeHidden();
  await expect(page.getByLabel('Inspector')).toBeHidden();
  await expect(canvas.getByText('Drop components here')).toBeHidden();
  await expect(canvas.getByText('Card title')).toBeVisible();

  // Clicking the page doesn't select anything; Escape returns to editing.
  await canvas.getByText('Card title').click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Component palette')).toBeVisible();
  await expect(page.getByText('Select a component on the canvas to edit its props')).toBeVisible();
});

test('stacks responsive grid columns in the mobile view', async ({ page }) => {
  const col = (id: string) => ({
    id,
    component: 'Col',
    props: { span: 12, xs: 24, md: 12 },
    children: [{ id: `${id}-tag`, component: 'Tag', props: { children: id }, children: [] }],
  });
  const root = {
    id: 'root',
    component: 'Flex',
    props: { vertical: true },
    children: [{ id: 'row', component: 'Row', props: {}, children: [col('left'), col('right')] }],
  };
  const project = {
    version: 1,
    name: 'Grid',
    theme: { mode: 'light', compact: false, token: {} },
    pages: [{ id: 'home', name: 'Home', root }],
    customComponents: [],
  };
  await page.addInitScript(
    (p) => localStorage.setItem('antd-builder:project', p),
    JSON.stringify(project),
  );
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const top = async (name: string) =>
    (await canvas.getByText(name, { exact: true }).boundingBox())!.y;

  await expect(canvas.getByText('right', { exact: true })).toBeVisible();
  expect(await top('right')).toBe(await top('left')); // side by side

  await page.getByText('Mobile', { exact: true }).click();
  await expect.poll(async () => (await top('right')) > (await top('left'))).toBe(true);

  await page.getByText('Tablet', { exact: true }).click();
  await expect.poll(async () => (await top('right')) === (await top('left'))).toBe(true);
});

test('right-clicking a component opens its menu', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const palette = page.getByLabel('Component palette');
  await dragTo(page, palette.getByRole('button', { name: 'Card', exact: true }), canvas);
  await dragTo(page, palette.getByRole('button', { name: 'Button', exact: true }), canvas);
  const card = canvas.locator('.ant-card');

  await canvas.getByRole('button', { name: 'Button' }).click({ button: 'right' });
  const menu = page.getByRole('menu');
  await expect(page.getByLabel('Inspector').getByRole('heading', { name: 'Button' })).toBeVisible();
  await menu.getByRole('menuitem', { name: /Cut/ }).click();
  await expect(canvas.getByRole('button', { name: 'Button' })).toHaveCount(0);

  // Paste into the card.
  await card.getByText('Drop components here').click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: /Paste/ }).click();
  await expect(card.getByRole('button', { name: 'Button' })).toBeVisible();
});

test('walks the component path from the inspector and the keyboard', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('canvas');
  const inspector = page.getByLabel('Inspector');
  const palette = page.getByLabel('Component palette');
  await dragTo(page, palette.getByRole('button', { name: 'Card', exact: true }), canvas);
  await dragTo(
    page,
    palette.getByRole('button', { name: 'Button', exact: true }),
    canvas.getByText('Drop components here'),
  );
  const path = inspector.getByRole('navigation', { name: 'Component path' });
  await expect(path).toHaveText('Page/Card/Button');

  await path.getByRole('button', { name: 'Card' }).click();
  await expect(inspector.getByRole('heading', { name: 'Card' })).toBeVisible();

  // Back down with Enter once focus leaves the inspector, then up with Shift+Enter.
  await canvas.locator('.ant-card-head').click();
  await page.keyboard.press('Enter');
  await expect(inspector.getByRole('heading', { name: 'Button' })).toBeVisible();
  await page.keyboard.press('Shift+Enter');
  await expect(inspector.getByRole('heading', { name: 'Card' })).toBeVisible();
});
