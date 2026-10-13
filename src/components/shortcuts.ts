'use client';

import { useEffect } from 'react';
import { NODE_ID_ATTR } from '@/components/canvas/nodeChain';
import { type EditorState, useEditorStore } from '@/lib/editor/store';

export interface Shortcut {
  /** Keys as shown to the user, e.g. `['Ctrl/⌘', 'Z']`. */
  keys: readonly string[];
  description: string;
  matches: (event: KeyboardEvent) => boolean;
  /**
   * Runs the command. Returns whether the key was consumed, which keeps the browser's own
   * action (bookmarking, native copy) from running too.
   */
  run: (state: EditorState, event: KeyboardEvent) => boolean;
}

const MOD = 'Ctrl/⌘';

const isMod = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

/** Matches Ctrl/Cmd + `key` (case-insensitive); `shift` pins the Shift state when given. */
const modKey =
  (key: string, shift?: boolean) =>
  (event: KeyboardEvent): boolean =>
    isMod(event) &&
    event.key.toLowerCase() === key &&
    (shift === undefined || event.shiftKey === shift);

export const SIDE_PANEL_ATTR = 'data-side-panel';

/** Side-panel controls (switches, selects) keep focus after edits; Delete must not hit the node. */
function isSidePanelTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest(`[${SIDE_PANEL_ATTR}]`);
}

/** Whether the user has highlighted page text, which Ctrl/Cmd+C should copy natively. */
function hasTextSelection(): boolean {
  const selection = window.getSelection();
  return !!selection && !selection.isCollapsed && selection.toString() !== '';
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Whether focus is in one of the editor's own dialogs (export, shortcut help), whose keys must
 * not edit the page behind them. Modal and Drawer previews on the canvas don't count.
 */
function isEditorDialogTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest('[aria-modal="true"]') &&
    !target.closest(`[${NODE_ID_ATTR}]`)
  );
}

/** Editor shortcuts, in the order they are matched and listed. */
export const shortcuts: readonly Shortcut[] = [
  {
    keys: [MOD, 'Z'],
    description: 'Undo',
    matches: modKey('z', false),
    run: (state) => {
      state.undo();
      return true;
    },
  },
  {
    keys: [MOD, 'Shift', 'Z'],
    description: 'Redo (also Ctrl+Y)',
    matches: (event) => modKey('z', true)(event) || modKey('y')(event),
    run: (state) => {
      state.redo();
      return true;
    },
  },
  {
    keys: [MOD, 'C'],
    description: 'Copy the selected component',
    matches: modKey('c'),
    run: ({ selectedId, copyNode }) => {
      if (!selectedId || hasTextSelection()) return false;
      copyNode(selectedId);
      return true;
    },
  },
  {
    keys: [MOD, 'X'],
    description: 'Cut the selected component',
    matches: modKey('x'),
    run: ({ selectedId, cutNode }) => {
      if (!selectedId || hasTextSelection()) return false;
      cutNode(selectedId);
      return true;
    },
  },
  {
    keys: [MOD, 'V'],
    description: 'Paste into or after the selected component',
    matches: modKey('v'),
    run: ({ pasteNode }) => pasteNode() !== null,
  },
  {
    keys: [MOD, 'D'],
    description: 'Duplicate the selected component',
    matches: modKey('d'),
    run: ({ selectedId, duplicateNode }) => {
      if (!selectedId) return false;
      duplicateNode(selectedId);
      return true;
    },
  },
  {
    keys: ['Alt', '↑'],
    description: 'Move the selected component up',
    matches: (event) => event.altKey && event.key === 'ArrowUp',
    run: ({ selectedId, nudgeNode }) => {
      if (!selectedId) return false;
      nudgeNode(selectedId, -1);
      return true;
    },
  },
  {
    keys: ['Alt', '↓'],
    description: 'Move the selected component down',
    matches: (event) => event.altKey && event.key === 'ArrowDown',
    run: ({ selectedId, nudgeNode }) => {
      if (!selectedId) return false;
      nudgeNode(selectedId, 1);
      return true;
    },
  },
  {
    keys: ['Delete'],
    description: 'Delete the selected component (also Backspace)',
    matches: (event) => event.key === 'Delete' || event.key === 'Backspace',
    run: ({ selectedId, removeNode }, event) => {
      if (!selectedId || isSidePanelTarget(event.target)) return false;
      removeNode(selectedId);
      return true;
    },
  },
  {
    keys: ['Esc'],
    description: 'Clear the selection',
    matches: (event) => event.key === 'Escape',
    run: ({ select }) => {
      select(null);
      return false; // let open popups close too
    },
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    matches: (event) => event.key === '?' && !isMod(event),
    run: ({ setShortcutHelpOpen }) => {
      setShortcutHelpOpen(true);
      return true;
    },
  },
];

/**
 * Runs the first shortcut matching `event`. Text fields keep their own native shortcuts, and
 * editor dialogs their own keys.
 */
export function handleShortcut(event: KeyboardEvent) {
  if (isEditableTarget(event.target) || isEditorDialogTarget(event.target)) return;
  const shortcut = shortcuts.find((candidate) => candidate.matches(event));
  if (shortcut?.run(useEditorStore.getState(), event)) event.preventDefault();
}

export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleShortcut(event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
