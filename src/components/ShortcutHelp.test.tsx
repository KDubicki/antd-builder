import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { ShortcutHelp } from './ShortcutHelp';
import { shortcuts } from './shortcuts';

beforeEach(() => useEditorStore.setState({ shortcutHelpOpen: false }));

describe('ShortcutHelp', () => {
  it('lists every shortcut with its keys', () => {
    render(<ShortcutHelp />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    const rows = within(screen.getByRole('dialog')).getAllByRole('row');
    expect(rows).toHaveLength(shortcuts.length);
    shortcuts.forEach((shortcut, i) => {
      expect(rows[i]).toHaveTextContent(shortcut.description);
      expect(within(rows[i]!).getAllByText((_, el) => el?.tagName === 'KBD')).toHaveLength(
        shortcut.keys.length,
      );
    });
  });

  it('closes', () => {
    useEditorStore.setState({ shortcutHelpOpen: true });
    render(<ShortcutHelp />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(useEditorStore.getState().shortcutHelpOpen).toBe(false);
  });
});
