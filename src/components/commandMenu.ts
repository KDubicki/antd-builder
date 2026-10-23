'use client';

import type { MenuProps } from 'antd';
import {
  type CommandGroup,
  type NodeCommand,
  nodeCommands,
  wrapGroup,
} from '@/components/nodeCommands';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '@/lib/editor/store';
import { ROOT_ID } from '@/lib/tree';

type MenuItem = NonNullable<MenuProps['items']>[number];

/** A menu entry: a command, a submenu of commands, or a divider between groups. */
export type CommandEntry = NodeCommand | CommandGroup | 'divider';

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
  wrapGroup,
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
 * disabled (a submenu too, when none of its commands can). Clicking an item runs its command on
 * the node.
 */
export function useCommandMenu(entries: readonly CommandEntry[], nodeId: string): MenuProps {
  const commands = entries.flatMap((entry) =>
    entry === 'divider' ? [] : 'commands' in entry ? entry.commands : [entry],
  );
  const enabled = useEditorStore(
    useShallow((state) => commands.map((command) => command.enabled(state, nodeId))),
  );
  const isEnabled = (command: NodeCommand) => enabled[commands.indexOf(command)];

  const toItem = (command: NodeCommand, label = command.label): MenuItem => ({
    key: command.label,
    label,
    icon: command.icon,
    danger: command.danger,
    extra: command.keys?.join('+'),
    disabled: !isEnabled(command),
  });

  return {
    items: entries.map((entry, i) => {
      if (entry === 'divider') return { type: 'divider', key: `divider-${i}` };
      if (!('commands' in entry)) return toItem(entry);
      return {
        key: `group-${entry.label}`,
        label: entry.label,
        icon: entry.icon,
        disabled: !entry.commands.some(isEnabled),
        // "Wrap in" › "Card", not "Wrap in Card" again.
        children: entry.commands.map((command) =>
          toItem(command, command.label.replace(`${entry.label} `, '')),
        ),
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
