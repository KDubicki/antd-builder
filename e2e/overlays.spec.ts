import { expect, test } from '@playwright/test';
import { createNode } from '../src/lib/registry';
import type { BuilderNode } from '../src/lib/schema';

/** Opens the editor on a page holding `nodes` (seeded through autosave). */
async function openWith(page: import('@playwright/test').Page, nodes: BuilderNode[]) {
  const root = { id: 'root', component: 'Flex', props: { vertical: true }, children: nodes };
  const project = {
    version: 1,
    name: 'Overlays',
    theme: { mode: 'light', compact: false, token: {} },
    pages: [{ id: 'page', name: 'Page', root }],
    customComponents: [],
  };
  await page.addInitScript(
    (saved) => localStorage.setItem('antd-builder:project', saved),
    JSON.stringify(project),
  );
  await page.goto('/');
}

const wrapping = (component: string, child: BuilderNode, props = {}): BuilderNode => {
  const node = createNode(component);
  return { ...node, props: { ...node.props, ...props }, children: [child] };
};

test('a dropdown opens from its child on the canvas', async ({ page }) => {
  await openWith(page, [
    wrapping('Dropdown', { ...createNode('Button'), props: { children: 'Actions' } }),
  ]);
  await page.getByTestId('canvas').getByRole('button', { name: 'Actions' }).hover();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
});

test('a tooltip shows on hover on the canvas', async ({ page }) => {
  await openWith(page, [
    wrapping('Tooltip', { ...createNode('Button'), props: { children: 'Hover me' } }),
  ]);
  await page.getByTestId('canvas').getByRole('button', { name: 'Hover me' }).hover();
  await expect(page.getByRole('tooltip', { name: 'Tooltip text' })).toBeVisible();
});

test('an always-open popover shows without interaction', async ({ page }) => {
  await openWith(page, [
    wrapping(
      'Popover',
      { ...createNode('Button'), props: { children: 'Details' } },
      {
        open: true,
      },
    ),
  ]);
  await expect(page.getByText('Popover content')).toBeVisible();
});

test('a tour previews its current step inline', async ({ page }) => {
  const tour = createNode('Tour');
  await openWith(page, [{ ...tour, props: { ...tour.props, current: 1 } }]);
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByText('Add your first item here.')).toBeVisible();
  // Past the first step, the panel offers to go back.
  await expect(canvas.getByRole('button', { name: 'Previous' })).toBeVisible();
});

test('modals, drawers and popconfirms preview inline on the canvas', async ({ page }) => {
  await openWith(page, [
    createNode('Modal'),
    createNode('Drawer'),
    wrapping(
      'Popconfirm',
      { ...createNode('Button'), props: { children: 'Delete' } },
      {
        open: true,
      },
    ),
  ]);
  const canvas = page.getByTestId('canvas');
  await expect(canvas.getByText('Modal title')).toBeVisible();
  await expect(canvas.getByRole('button', { name: 'OK' })).toBeVisible();
  await expect(canvas.getByText('Drawer title')).toBeVisible();
  await expect(page.getByText('Delete this item?')).toBeVisible();
});
