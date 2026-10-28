import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  BlockOutlined,
  BorderOuterOutlined,
  ClearOutlined,
  FormatPainterFilled,
  FormatPainterOutlined,
  VerticalAlignTopOutlined,
  DeleteOutlined,
  ExpandOutlined,
  ScissorOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { type EditorState } from '@/lib/editor/store';
import { getComponentMeta } from '@/lib/registry';
import {
  findNode,
  findParent,
  resolveDrop,
  ROOT_ID,
  sameProps,
  siblingId,
  unwrapNode,
  wrapNode,
} from '@/lib/tree';

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
const canNudge = (delta: -1 | 1) => (state: EditorState, id: string) =>
  siblingId(state.root, id, delta) !== null;

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
  copyProps: {
    label: 'Copy props',
    name: 'Copy props',
    icon: <FormatPainterOutlined />,
    keys: [MOD, 'Alt', 'C'],
    enabled: notRoot,
    run: (state, id) => state.copyProps(id),
  },
  /** Only onto a component of the kind the props were copied from. */
  pasteProps: {
    label: 'Paste props',
    name: 'Paste props',
    icon: <FormatPainterFilled />,
    keys: [MOD, 'Alt', 'V'],
    enabled: ({ propsClipboard, root }, id) =>
      id !== ROOT_ID &&
      !!propsClipboard &&
      findNode(root, id)?.component === propsClipboard.component,
    run: (state, id) => state.pasteProps(id),
  },
  resetProps: {
    label: 'Reset props',
    name: 'Reset props',
    icon: <ClearOutlined />,
    enabled: (state, id) => {
      const node = id === ROOT_ID ? undefined : findNode(state.root, id);
      const meta = node && getComponentMeta(node.component);
      return !!node && !!meta && !sameProps(node.props, meta.defaultProps);
    },
    run: (state, id) => state.resetProps(id),
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

/** "Wrap in Card": puts the component inside a new `component`, where nesting rules allow. */
function wrapIn(component: string, keys?: readonly string[]): NodeCommand {
  const label = `Wrap in ${getComponentMeta(component)?.label ?? component}`;
  const wrapper = { id: '', component, props: {}, children: [] };
  return {
    label,
    name: label,
    icon: <BorderOuterOutlined />,
    keys,
    enabled: (state, id) => wrapNode(state.root, id, wrapper) !== null,
    run: (state, id) => {
      state.wrapNode(id, component);
    },
  };
}

export const wrapInFlex = wrapIn('Flex', [MOD, 'G']);

/** The containers offered by "Wrap in", in menu order. */
export const wrapCommands: readonly NodeCommand[] = [wrapInFlex, wrapIn('Card'), wrapIn('Space')];

/** Commands shown together under one menu item, e.g. "Wrap in" › Flex, Card, Space. */
export interface CommandGroup {
  label: string;
  icon: ReactNode;
  commands: readonly NodeCommand[];
}

export const wrapGroup: CommandGroup = {
  label: 'Wrap in',
  icon: <BorderOuterOutlined />,
  commands: wrapCommands,
};

/** Moving props between components of the same kind, and back to the defaults. */
export const propsGroup: CommandGroup = {
  label: 'Props',
  icon: <FormatPainterOutlined />,
  commands: [nodeCommands.copyProps, nodeCommands.pasteProps, nodeCommands.resetProps],
};

/** "Duplicate (Ctrl/⌘+D)": a command's tooltip with its keys. */
export function commandTitle(command: NodeCommand): string {
  return command.keys ? `${command.label} (${command.keys.join('+')})` : command.label;
}
