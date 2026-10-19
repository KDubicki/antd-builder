import type { TreeDataNode } from 'antd';
import { getComponentMeta } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { ROOT_ID } from '@/lib/editor/store';
import { pathTo } from '@/lib/tree';

export interface LayerNode extends TreeDataNode {
  key: string;
  /** Registry label, e.g. "Button" ("Page" for the root). */
  label: string;
  /** Short text from the node's own props (button label, card title) to tell siblings apart. */
  hint?: string;
  children: LayerNode[];
}

const HINT_PROPS = ['children', 'title', 'placeholder'] as const;
const HINT_MAX = 24;

function hintOf(node: BuilderNode): string | undefined {
  for (const prop of HINT_PROPS) {
    const value = node.props[prop];
    if (typeof value === 'string' && value.trim() !== '') {
      const text = value.trim().replace(/\s+/g, ' ');
      return text.length > HINT_MAX ? `${text.slice(0, HINT_MAX - 1)}…` : text;
    }
  }
  return undefined;
}

/** The page tree as data for antd's `Tree`, keyed by node id. */
export function toLayerTree(node: BuilderNode): LayerNode {
  const label =
    node.id === ROOT_ID ? 'Page' : (getComponentMeta(node.component)?.label ?? node.component);
  const hint = hintOf(node);
  return {
    key: node.id,
    label,
    // Defaults like a Button labelled "Button" would just repeat the label.
    hint: hint === label ? undefined : hint,
    children: node.children.map(toLayerTree),
  };
}

/** Ids of the nodes on the path from the root down to `id` (excluding `id`), or [] if absent. */
export function ancestorIds(root: BuilderNode, id: string): string[] {
  return pathTo(root, id)
    .slice(0, -1)
    .map((node) => node.id);
}

/** Ids of every node that has children, i.e. everything the tree can expand. */
export function expandableIds(node: BuilderNode): string[] {
  if (node.children.length === 0) return [];
  return [node.id, ...node.children.flatMap(expandableIds)];
}

/** Expandable layers minus the ones the user collapsed, except those holding the selection. */
export function expandedIds(
  root: BuilderNode,
  selectedId: string | null,
  collapsed: ReadonlySet<string>,
): string[] {
  const revealed = new Set(selectedId ? ancestorIds(root, selectedId) : []);
  return expandableIds(root).filter((id) => revealed.has(id) || !collapsed.has(id));
}
