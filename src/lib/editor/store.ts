import { create } from 'zustand';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { type DropTarget, insertNode, isWithin, moveNode, removeNode } from '@/lib/tree';

export const ROOT_ID = 'root';

export function createRoot(): BuilderNode {
  return {
    id: ROOT_ID,
    component: 'Flex',
    props: { vertical: true, gap: 'middle' },
    children: [],
  };
}

export interface EditorState {
  /** Root of the page being edited. It is fixed: it can't be moved or removed. */
  root: BuilderNode;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Adds a new registry component at `target` and selects it. Returns the new node's id. */
  addNode: (component: string, target: DropTarget) => string;
  moveNode: (id: string, target: DropTarget) => void;
  removeNode: (id: string) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  root: createRoot(),
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  addNode: (component, target) => {
    const node = createNode(component);
    set((state) => ({ root: insertNode(state.root, node, target), selectedId: node.id }));
    return node.id;
  },
  moveNode: (id, target) => {
    if (id === ROOT_ID) return;
    set((state) => ({ root: moveNode(state.root, id, target) }));
  },
  removeNode: (id) => {
    if (id === ROOT_ID) return;
    set((state) => ({
      root: removeNode(state.root, id),
      selectedId:
        state.selectedId && isWithin(state.root, id, state.selectedId) ? null : state.selectedId,
    }));
  },
}));
