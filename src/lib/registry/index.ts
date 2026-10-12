import type { BuilderNode } from '@/lib/schema';
import { components } from './components';
import type { ComponentCategory, ComponentMeta } from './types';

export type { ChildrenRule, ComponentCategory, ComponentMeta, PropDefinition } from './types';
export { components };

const byName = new Map(components.map((meta) => [meta.name, meta]));

export const categoryLabels: Readonly<Record<ComponentCategory, string>> = {
  layout: 'Layout',
  general: 'General',
  typography: 'Typography',
  navigation: 'Navigation',
  'data-entry': 'Data entry',
  'data-display': 'Data display',
  feedback: 'Feedback',
  other: 'Other',
};

export function getComponentMeta(name: string): ComponentMeta | undefined {
  return byName.get(name);
}

/** Whether a `child` component may be placed directly inside a `parent` component. */
export function canContain(parent: string, child: string): boolean {
  const parentMeta = byName.get(parent);
  const childMeta = byName.get(child);
  if (!parentMeta || !childMeta) return false;

  const rule = parentMeta.children;
  if (rule === 'none') return false;
  if (rule !== 'any') return rule.includes(child);
  return !childMeta.parents || childMeta.parents.includes(parent);
}

/**
 * Whether `node` can take one more child. `movingId` is a child being moved within the node,
 * which doesn't count because it frees its own slot.
 */
export function hasRoomFor(node: BuilderNode, movingId?: string): boolean {
  const max = byName.get(node.component)?.maxChildren;
  if (max === undefined) return true;
  return node.children.filter((child) => child.id !== movingId).length < max;
}

/**
 * A node for `name` wrapped in the parents it requires (e.g. a Col inside a Row), so it can
 * stand on the page. Returns the outermost node; the requested node has id `id`.
 */
export function createPlaceableNode(name: string, id?: string): BuilderNode {
  let node = createNode(name, id);
  let parent = byName.get(name)?.parents?.[0];
  while (parent) {
    node = { ...createNode(parent), children: [node] };
    parent = byName.get(parent)?.parents?.[0];
  }
  return node;
}

/** Creates a new node for a registry component, with its default props and children. */
export function createNode(name: string, id: string = crypto.randomUUID()): BuilderNode {
  const meta = byName.get(name);
  if (!meta) throw new Error(`Unknown component: ${name}`);
  return {
    id,
    component: name,
    props: structuredClone(meta.defaultProps),
    children: (meta.defaultChildren ?? []).map((child) => createNode(child)),
  };
}
