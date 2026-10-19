'use client';

import type { MenuProps } from 'antd';
import type { NodeCommand } from '@/components/nodeCommands';
import { useEditorStore } from '@/lib/editor/store';

/** A menu entry: a command, or a divider between groups. */
export type CommandEntry = NodeCommand | 'divider';

/**
 * Menu props listing `entries` for node `nodeId`, with commands that can't run right now
 * disabled. Clicking an item runs its command on the node.
 */
export function useCommandMenu(entries: readonly CommandEntry[], nodeId: string): MenuProps {
  const commands = entries.filter((entry): entry is NodeCommand => entry !== 'divider');
  // A string, so the selector result stays stable while nothing relevant changes.
  const enabled = useEditorStore((state) =>
    commands.map((command) => (command.enabled(state, nodeId) ? '1' : '0')).join(''),
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
        disabled: enabled[commands.indexOf(entry)] !== '1',
      };
    }),
    onClick: ({ key }) =>
      commands.find((command) => command.label === key)?.run(useEditorStore.getState(), nodeId),
  };
}
