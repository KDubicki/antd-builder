'use client';

import { Dropdown } from 'antd';
import type { MouseEvent, ReactElement } from 'react';
import { type CommandEntry, useCommandMenu } from '@/components/commandMenu';
import { nodeCommands, wrapCommands } from '@/components/nodeCommands';
import { useEditorStore } from '@/lib/editor/store';
import { NODE_ID_ATTR } from './nodeChain';
import { ROOT_ID } from '@/lib/tree';

const {
  duplicate,
  copy,
  cut,
  paste,
  moveUp,
  moveDown,
  unwrap,
  selectParent,
  delete: remove,
} = nodeCommands;

const NODE_ENTRIES: readonly CommandEntry[] = [
  duplicate,
  copy,
  cut,
  paste,
  'divider',
  ...wrapCommands,
  unwrap,
  'divider',
  moveUp,
  moveDown,
  selectParent,
  'divider',
  remove,
];

/** The page itself can only receive pasted components. */
const ROOT_ENTRIES: readonly CommandEntry[] = [paste];

/** The canvas node a right-click landed on: the innermost one, or the page. */
function nodeIdAt(event: MouseEvent): string {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest(`[${NODE_ID_ATTR}]`)?.getAttribute(NODE_ID_ATTR) ?? ROOT_ID;
}

/**
 * Right-click menu for canvas components. The click selects the component under the pointer,
 * and the menu offers the commands that apply to it.
 */
export function NodeContextMenu({ children }: { children: ReactElement }) {
  const selectedId = useEditorStore((state) => state.selectedId) ?? ROOT_ID;
  const preview = useEditorStore((state) => state.previewMode);
  const menu = useCommandMenu(selectedId === ROOT_ID ? ROOT_ENTRIES : NODE_ENTRIES, selectedId);

  return (
    <Dropdown trigger={['contextMenu']} disabled={preview} menu={menu}>
      <div
        style={{ display: 'contents' }}
        onContextMenu={
          preview ? undefined : (event) => useEditorStore.getState().select(nodeIdAt(event))
        }
      >
        {children}
      </div>
    </Dropdown>
  );
}
