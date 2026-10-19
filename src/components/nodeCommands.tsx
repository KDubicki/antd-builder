import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  ScissorOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { ROOT_ID, type EditorState } from '@/lib/editor/store';
import { siblingPosition } from '@/lib/tree';

/** Something to do with one component on the page, shared by buttons, menus and shortcuts. */
export interface NodeCommand {
  /** Menu text, e.g. "Duplicate". */
  label: string;
  /** Accessible name for an icon-only button, e.g. "Duplicate component". */
  name: string;
  icon: ReactNode;
  /** Keys as shown to the user, e.g. `['Ctrl/⌘', 'D']`. */
  keys?: readonly string[];
  danger?: boolean;
  /** Whether the command can run on node `id` right now. */
  enabled: (state: EditorState, id: string) => boolean;
  run: (state: EditorState, id: string) => void;
}

export const MOD = 'Ctrl/⌘';

const notRoot = (_state: EditorState, id: string) => id !== ROOT_ID;

/** Whether the node can move one place by `delta` among its siblings. */
const canNudge = (delta: -1 | 1) => (state: EditorState, id: string) => {
  const position = siblingPosition(state.root, id);
  if (!position) return false;
  const to = position.index + delta;
  return to >= 0 && to < position.count;
};

export const nodeCommands = {
  moveUp: {
    label: 'Move up',
    name: 'Move up',
    icon: <ArrowUpOutlined />,
    keys: ['Alt', '↑'],
    enabled: canNudge(-1),
    run: (state, id) => state.nudgeNode(id, -1),
  },
  moveDown: {
    label: 'Move down',
    name: 'Move down',
    icon: <ArrowDownOutlined />,
    keys: ['Alt', '↓'],
    enabled: canNudge(1),
    run: (state, id) => state.nudgeNode(id, 1),
  },
  duplicate: {
    label: 'Duplicate',
    name: 'Duplicate component',
    icon: <CopyOutlined />,
    keys: [MOD, 'D'],
    enabled: notRoot,
    run: (state, id) => state.duplicateNode(id),
  },
  copy: {
    label: 'Copy',
    name: 'Copy component',
    icon: <SnippetsOutlined />,
    keys: [MOD, 'C'],
    enabled: notRoot,
    run: (state, id) => state.copyNode(id),
  },
  cut: {
    label: 'Cut',
    name: 'Cut component',
    icon: <ScissorOutlined />,
    keys: [MOD, 'X'],
    enabled: notRoot,
    run: (state, id) => state.cutNode(id),
  },
  delete: {
    label: 'Delete',
    name: 'Delete component',
    icon: <DeleteOutlined />,
    danger: true,
    enabled: notRoot,
    run: (state, id) => state.removeNode(id),
  },
} satisfies Record<string, NodeCommand>;

export type NodeCommandId = keyof typeof nodeCommands;

/** "Duplicate (Ctrl/⌘+D)": a command's tooltip with its keys. */
export function commandTitle(command: NodeCommand): string {
  return command.keys ? `${command.label} (${command.keys.join('+')})` : command.label;
}
