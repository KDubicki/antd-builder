'use client';

import { Dropdown } from 'antd';
import type { MouseEvent, ReactElement } from 'react';
import { useNodeMenu } from '@/components/commandMenu';
import { useEditorStore } from '@/lib/editor/store';
import { NODE_ID_ATTR } from './nodeChain';
import { ROOT_ID } from '@/lib/tree';

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
  const menu = useNodeMenu(selectedId);

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
