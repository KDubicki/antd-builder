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
  'data-entry': 'Data entry',
  feedback: 'Feedback',
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

/** Creates a new node for a registry component, with its default props. */
export function createNode(name: string, id: string = crypto.randomUUID()): BuilderNode {
  const meta = byName.get(name);
  if (!meta) throw new Error(`Unknown component: ${name}`);
  return { id, component: name, props: { ...meta.defaultProps }, children: [] };
}
