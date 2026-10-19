'use client';

import { useEffect } from 'react';
import { NODE_ID_ATTR } from '@/components/canvas/nodeChain';
import { MOD, type NodeCommand, nodeCommands } from '@/components/nodeCommands';
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

/**
 * Runs `command` on the selected component, unless `skip` says the key belongs to something else.
 * The key counts as consumed whenever a component is selected, even if the command can't run
 * (e.g. moving the first component up).
 */
const onSelection =
  (command: NodeCommand, skip?: (event: KeyboardEvent) => boolean) =>
  (state: EditorState, event: KeyboardEvent): boolean => {
    const { selectedId } = state;
    if (!selectedId || skip?.(event)) return false;
    if (command.enabled(state, selectedId)) command.run(state, selectedId);
    return true;
  };

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
    run: onSelection(nodeCommands.copy, hasTextSelection),
  },
  {
    keys: [MOD, 'X'],
    description: 'Cut the selected component',
    matches: modKey('x'),
    run: onSelection(nodeCommands.cut, hasTextSelection),
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
    run: onSelection(nodeCommands.duplicate),
  },
  {
    keys: ['Alt', '↑'],
    description: 'Move the selected component up',
    matches: (event) => event.altKey && event.key === 'ArrowUp',
    run: onSelection(nodeCommands.moveUp),
  },
  {
    keys: ['Alt', '↓'],
    description: 'Move the selected component down',
    matches: (event) => event.altKey && event.key === 'ArrowDown',
    run: onSelection(nodeCommands.moveDown),
  },
  {
    keys: ['Delete'],
    description: 'Delete the selected component (also Backspace)',
    matches: (event) => event.key === 'Delete' || event.key === 'Backspace',
    run: onSelection(nodeCommands.delete, (event) => isSidePanelTarget(event.target)),
  },
  {
    keys: ['Esc'],
    description: 'Clear the selection, or leave preview',
    matches: (event) => event.key === 'Escape',
    run: ({ select, previewMode, setPreviewMode }) => {
      if (previewMode) setPreviewMode(false);
      else select(null);
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
