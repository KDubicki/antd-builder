'use client';

import type { MenuProps } from 'antd';
import { type NodeCommand, nodeCommands, wrapCommands } from '@/components/nodeCommands';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '@/lib/editor/store';
import { ROOT_ID } from '@/lib/tree';

/** A menu entry: a command, or a divider between groups. */
export type CommandEntry = NodeCommand | 'divider';

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

/**
 * Menu props listing `entries` for node `nodeId`, with commands that can't run right now
 * disabled. Clicking an item runs its command on the node.
 */
export function useCommandMenu(entries: readonly CommandEntry[], nodeId: string): MenuProps {
  const commands = entries.filter((entry): entry is NodeCommand => entry !== 'divider');
  const enabled = useEditorStore(
    useShallow((state) => commands.map((command) => command.enabled(state, nodeId))),
  );
  return {
    items: entries.map((entry, i) => {
      if (entry === 'divider') return { type: 'divider', key: `divider-${i}` };
      return {
        key: entry.label,
        label: entry.label,
        icon: entry.icon,
        danger: entry.danger,
        extra: entry.keys?.join('+'),
        disabled: !enabled[commands.indexOf(entry)],
      };
    }),
    onClick: ({ key }) =>
      commands.find((command) => command.label === key)?.run(useEditorStore.getState(), nodeId),
  };
}

/** The right-click menu for node `nodeId`, on the canvas or in the layers outline. */
export function useNodeMenu(nodeId: string): MenuProps {
  return useCommandMenu(nodeId === ROOT_ID ? ROOT_ENTRIES : NODE_ENTRIES, nodeId);
}
