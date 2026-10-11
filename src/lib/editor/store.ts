import { create } from 'zustand';
import { createNode } from '@/lib/registry';
import type { BuilderNode, ProjectTheme } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import {
  type DropTarget,
  insertNode,
  isWithin,
  moveNode,
  removeNode,
  updateNodeProps,
} from '@/lib/tree';

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
  name: string;
  /** Root of the page being edited. It is fixed: it can't be moved or removed. */
  root: BuilderNode;
  theme: ProjectTheme;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Adds a new registry component at `target` and selects it. Returns the new node's id. */
  addNode: (component: string, target: DropTarget) => string;
  moveNode: (id: string, target: DropTarget) => void;
  removeNode: (id: string) => void;
  /** Merges `patch` into a node's props; `undefined` values remove the prop. */
  updateProps: (id: string, patch: Readonly<Record<string, unknown>>) => void;
  setThemeMode: (mode: ProjectTheme['mode']) => void;
  setCompact: (compact: boolean) => void;
  /** Overrides a seed token; `undefined` restores antd's default. */
  setThemeToken: (key: string, value: string | number | undefined) => void;
  resetTheme: () => void;
  setName: (name: string) => void;
  /** Replaces the whole project (e.g. after opening a file) and clears the selection. */
  loadProject: (content: { name: string; root: BuilderNode; theme: ProjectTheme }) => void;
}

export const DEFAULT_PROJECT_NAME = 'Untitled project';

export const useEditorStore = create<EditorState>()((set) => ({
  name: DEFAULT_PROJECT_NAME,
  root: createRoot(),
  theme: createTheme(),
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
  updateProps: (id, patch) => set((state) => ({ root: updateNodeProps(state.root, id, patch) })),
  setThemeMode: (mode) => set((state) => ({ theme: { ...state.theme, mode } })),
  setCompact: (compact) => set((state) => ({ theme: { ...state.theme, compact } })),
  setThemeToken: (key, value) =>
    set((state) => {
      const token = { ...state.theme.token };
      if (value === undefined) delete token[key];
      else token[key] = value;
      return { theme: { ...state.theme, token } };
    }),
  resetTheme: () => set({ theme: createTheme() }),
  setName: (name) => set({ name }),
  loadProject: ({ name, root, theme }) => set({ name, root, theme, selectedId: null }),
}));
