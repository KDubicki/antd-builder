import type { BuilderNode } from '@/lib/schema';
import { type DropTarget, resolveDrop } from '@/lib/tree';

/**
 * dnd-kit drag payload: a palette component, a ready-made block (`component` is its root's) or
 * an existing canvas node.
 */
export type DragData =
  | { type: 'palette'; component: string }
  | { type: 'block'; block: string; component: string }
  | { type: 'node'; nodeId: string; component: string };

export type DropAction =
  | { type: 'add'; component: string; target: DropTarget }
  | { type: 'block'; block: string; target: DropTarget }
  | { type: 'move'; nodeId: string; target: DropTarget };

/**
 * Decides what a drop does. `chain` lists the canvas node ids under the pointer, innermost
 * first; a drop on empty canvas space (empty chain) goes to the end of the root.
 */
export function planDrop(
  root: BuilderNode,
  data: DragData,
  chain: readonly string[],
): DropAction | null {
  const path = chain.length > 0 ? chain : [root.id];
  if (data.type === 'palette') {
    const target = resolveDrop(root, path, data.component);
    return target && { type: 'add', component: data.component, target };
  }
  if (data.type === 'block') {
    const target = resolveDrop(root, path, data.component);
    return target && { type: 'block', block: data.block, target };
  }
  const target = resolveDrop(root, path, data.component, data.nodeId);
  return target && { type: 'move', nodeId: data.nodeId, target };
}
