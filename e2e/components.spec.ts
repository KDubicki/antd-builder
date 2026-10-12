import { expect, test } from '@playwright/test';
import { components, getComponentMeta } from '../src/lib/registry';
import { dragTo } from './helpers';

/** Required parents of a component, outermost first (e.g. Col -> [Row]). */
function parentChain(name: string): string[] {
  const parent = getComponentMeta(name)?.parents?.[0];
  return parent ? [...parentChain(parent), parent] : [];
}

for (const meta of components) {
  test(`adds ${meta.name} from the palette`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));

    await page.goto('/');
    const palette = page.getByLabel('Component palette');
    const canvas = page.getByTestId('canvas');
    // Palette items are dnd-kit draggables (role="button"); category headings share some labels.
    const paletteItem = (name: string) =>
      palette.getByRole('button', { name: getComponentMeta(name)!.label, exact: true });

    // Build the required parents first; the subject then goes into the newest empty container.
    let target = canvas;
    for (const parent of parentChain(meta.name)) {
      await dragTo(page, paletteItem(parent), target);
      target = canvas.getByText('Drop components here').first();
    }
    await dragTo(page, paletteItem(meta.name), target);

    // A dropped component is selected, so the inspector shows it.
    await expect(
      page.getByLabel('Inspector').getByRole('heading', { name: meta.label, exact: true }),
    ).toBeVisible();
    await expect(canvas.getByText(/Unknown component/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
