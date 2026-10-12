import { canContain } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';

/** Where a node goes: the parent's id and the index among its children. */
export interface DropTarget {
  parentId: string;
  index: number;
}

export function findNode(root: BuilderNode, id: string): BuilderNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function findParent(root: BuilderNode, id: string): BuilderNode | undefined {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Whether `id` is `ancestorId` itself or lies somewhere below it. */
export function isWithin(root: BuilderNode, ancestorId: string, id: string): boolean {
  const ancestor = findNode(root, ancestorId);
  return !!ancestor && !!findNode(ancestor, id);
}

/** Returns a copy of the tree with `fn` applied to the node `id` (structural sharing elsewhere). */
function mapNode(
  node: BuilderNode,
  id: string,
  fn: (node: BuilderNode) => BuilderNode,
): BuilderNode {
  if (node.id === id) return fn(node);
  let changed = false;
  const children = node.children.map((child) => {
    const next = mapNode(child, id, fn);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...node, children } : node;
}

export function insertNode(root: BuilderNode, node: BuilderNode, target: DropTarget): BuilderNode {
  return mapNode(root, target.parentId, (parent) => {
    const children = [...parent.children];
    children.splice(Math.min(Math.max(target.index, 0), children.length), 0, node);
    return { ...parent, children };
  });
}

export function removeNode(root: BuilderNode, id: string): BuilderNode {
  const parent = findParent(root, id);
  if (!parent) return root;
  return mapNode(root, parent.id, (p) => ({
    ...p,
    children: p.children.filter((child) => child.id !== id),
  }));
}

/** Merges `patch` into a node's props; `undefined` values remove the prop. */
export function updateNodeProps(
  root: BuilderNode,
  id: string,
  patch: Readonly<Record<string, unknown>>,
): BuilderNode {
  return mapNode(root, id, (node) => {
    const props = { ...node.props, ...patch };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete props[key];
    }
    return { ...node, props };
  });
}

/** Deep copy of a subtree in which every node gets a fresh id from `newId`. */
export function cloneNode(
  node: BuilderNode,
  newId: () => string = () => crypto.randomUUID(),
): BuilderNode {
  return {
    id: newId(),
    component: node.component,
    props: structuredClone(node.props),
    children: node.children.map((child) => cloneNode(child, newId)),
  };
}

/**
 * Inserts a copy of node `id` (with fresh ids) right after it. Returns the new tree and the
 * copy's id, or `null` when the node doesn't exist or is the root (which has no parent).
 */
export function duplicateNode(
  root: BuilderNode,
  id: string,
  newId?: () => string,
): { root: BuilderNode; id: string } | null {
  const node = findNode(root, id);
  const parent = findParent(root, id);
  if (!node || !parent) return null;
  const copy = cloneNode(node, newId);
  const index = parent.children.indexOf(node) + 1;
  return { root: insertNode(root, copy, { parentId: parent.id, index }), id: copy.id };
}

/** Moves a node to `target`. `target.index` refers to the parent's children before the move. */
export function moveNode(root: BuilderNode, id: string, target: DropTarget): BuilderNode {
  const node = findNode(root, id);
  const parent = findParent(root, id);
  if (!node || !parent || isWithin(root, id, target.parentId)) return root;

  let { index } = target;
  if (parent.id === target.parentId) {
    const from = parent.children.findIndex((child) => child.id === id);
    if (from < index) index -= 1;
  }
  return insertNode(removeNode(root, id), node, { parentId: target.parentId, index });
}

/**
 * Picks where a dropped component lands, given the canvas nodes under the pointer
 * (innermost first). The innermost node that accepts the component gets it appended;
 * a node that doesn't accept it gets it inserted right after itself, if its parent does.
 * When moving an existing node, targets inside that node are skipped.
 */
export function resolveDrop(
  root: BuilderNode,
  chain: readonly string[],
  component: string,
  movingId?: string,
): DropTarget | null {
  const ids = movingId ? chain.filter((id) => !isWithin(root, movingId, id)) : chain;

  for (const id of ids) {
    const node = findNode(root, id);
    if (!node) continue;
    if (canContain(node.component, component)) {
      return { parentId: node.id, index: node.children.length };
    }
    const parent = findParent(root, id);
    if (parent && canContain(parent.component, component)) {
      return { parentId: parent.id, index: parent.children.indexOf(node) + 1 };
    }
  }
  return null;
}
