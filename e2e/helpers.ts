import type { Locator, Page } from '@playwright/test';

const DROP_CLICK_GUARD_MS = 100;

/** Drags with real pointer moves so dnd-kit's pointer sensor activates. */
export async function dragTo(page: Page, source: Locator, target: Locator) {
  // The palette scrolls; items further down must be brought into view first.
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target is not visible');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();
  // dnd-kit swallows clicks for 50 ms after a drop, so the drop itself never counts as a click.
  // Without this wait, a test's next click can land in that window and be lost.
  await page.waitForTimeout(DROP_CLICK_GUARD_MS);
}
