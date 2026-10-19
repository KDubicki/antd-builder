'use client';

import type { MenuProps } from 'antd';
import type { NodeCommand } from '@/components/nodeCommands';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '@/lib/editor/store';

/** A menu entry: a command, or a divider between groups. */
export type CommandEntry = NodeCommand | 'divider';

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
