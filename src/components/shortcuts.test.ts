import { describe, expect, it } from 'vitest';
import { shortcuts } from './shortcuts';

const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

/** One representative event per shortcut, in table order. */
const examples: Record<string, KeyboardEvent[]> = {
  Undo: [key({ key: 'z', ctrlKey: true }), key({ key: 'Z', metaKey: true })],
  'Redo (also Ctrl+Y)': [
    key({ key: 'Z', metaKey: true, shiftKey: true }),
    key({ key: 'y', ctrlKey: true }),
  ],
  'Save a version of the project, even while typing': [key({ key: 's', ctrlKey: true })],
  'Copy the selected component': [key({ key: 'c', metaKey: true })],
  'Cut the selected component': [key({ key: 'x', ctrlKey: true })],
  'Paste into or after the selected component': [key({ key: 'v', ctrlKey: true })],
  'Duplicate the selected component': [key({ key: 'D', metaKey: true })],
  'Wrap the selected component in a Flex': [key({ key: 'g', ctrlKey: true })],
  'Unwrap the selected container': [key({ key: 'G', metaKey: true, shiftKey: true })],
  'Move the selected component up': [key({ key: 'ArrowUp', altKey: true })],
  'Move the selected component down': [key({ key: 'ArrowDown', altKey: true })],
  'Select the parent of the selected component': [key({ key: 'Enter', shiftKey: true })],
  'Select the first component inside the selected one': [key({ key: 'Enter' })],
  'Select the previous component': [key({ key: 'ArrowUp' })],
  'Select the next component': [key({ key: 'ArrowDown' })],
  'Delete the selected component (also Backspace)': [
    key({ key: 'Delete' }),
    key({ key: 'Backspace' }),
  ],
  'Clear the selection, or leave preview': [key({ key: 'Escape' })],
  'Show keyboard shortcuts': [key({ key: '?', shiftKey: true })],
};

describe('shortcuts', () => {
  it('has an example for every shortcut', () => {
    expect(shortcuts.map((s) => s.description)).toEqual(Object.keys(examples));
  });

  it.each(Object.entries(examples))('matches only "%s" for its keys', (description, events) => {
    for (const event of events) {
      const matching = shortcuts.filter((s) => s.matches(event)).map((s) => s.description);
      expect(matching, event.key).toEqual([description]);
    }
  });

  it('ignores plain letters', () => {
    for (const letter of ['z', 'y', 'c', 'x', 'v', 'd', 'g', 's']) {
      expect(shortcuts.some((s) => s.matches(key({ key: letter })))).toBe(false);
    }
  });
});
