import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  BlockOutlined,
  BorderOuterOutlined,
  VerticalAlignTopOutlined,
  DeleteOutlined,
  ExpandOutlined,
  ScissorOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { ROOT_ID, type EditorState } from '@/lib/editor/store';
import { getComponentMeta } from '@/lib/registry';
import { findParent, resolveDrop, siblingPosition, unwrapNode, wrapNode } from '@/lib/tree';

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
    icon: <BlockOutlined />,
    keys: [MOD, 'D'],
    enabled: notRoot,
    run: (state, id) => state.duplicateNode(id),
  },
  copy: {
    label: 'Copy',
    name: 'Copy component',
    icon: <CopyOutlined />,
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
  paste: {
    label: 'Paste',
    name: 'Paste into or after the component',
    icon: <SnippetsOutlined />,
    keys: [MOD, 'V'],
    enabled: ({ clipboard, root }, id) =>
      !!clipboard && resolveDrop(root, [id], clipboard.component) !== null,
    run: (state, id) => {
      state.select(id);
      state.pasteNode();
    },
  },
  delete: {
    label: 'Delete',
    name: 'Delete component',
    icon: <DeleteOutlined />,
    danger: true,
    enabled: notRoot,
    run: (state, id) => state.removeNode(id),
  },
  selectParent: {
    label: 'Select parent',
    name: 'Select parent',
    icon: <VerticalAlignTopOutlined />,
    keys: ['Shift', 'Enter'],
    enabled: notRoot,
    run: (state, id) => {
      const parent = findParent(state.root, id);
      if (parent) state.select(parent.id);
    },
  },
  /** Removes a container, keeping what's inside it. */
  unwrap: {
    label: 'Unwrap',
    name: 'Unwrap component',
    icon: <ExpandOutlined />,
    keys: [MOD, 'Shift', 'G'],
    enabled: (state, id) => unwrapNode(state.root, id) !== null,
    run: (state, id) => state.unwrapNode(id),
  },
} satisfies Record<string, NodeCommand>;

export type NodeCommandId = keyof typeof nodeCommands;

/** Containers offered by "Wrap in", in menu order; the first one has a shortcut. */
export const WRAPPERS = ['Flex', 'Card', 'Space'] as const;

/** Whether node `id` can be wrapped in `component`, without creating the wrapper. */
const canWrap = (component: string) => (state: EditorState, id: string) =>
  wrapNode(state.root, id, { id: '', component, props: {}, children: [] }) !== null;

/** "Wrap in Flex", "Wrap in Card"…: puts the component inside a new container. */
export const wrapCommands: Readonly<Record<(typeof WRAPPERS)[number], NodeCommand>> =
  Object.fromEntries(
    WRAPPERS.map((component, i) => {
      const label = `Wrap in ${getComponentMeta(component)?.label ?? component}`;
      const command: NodeCommand = {
        label,
        name: label,
        icon: <BorderOuterOutlined />,
        ...(i === 0 && { keys: [MOD, 'G'] }),
        enabled: canWrap(component),
        run: (state, id) => {
          state.wrapNode(id, component);
        },
      };
      return [component, command];
    }),
  ) as Record<(typeof WRAPPERS)[number], NodeCommand>;

/** "Duplicate (Ctrl/⌘+D)": a command's tooltip with its keys. */
export function commandTitle(command: NodeCommand): string {
  return command.keys ? `${command.label} (${command.keys.join('+')})` : command.label;
}
