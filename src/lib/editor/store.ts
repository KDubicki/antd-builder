import { create } from 'zustand';
import { getBlock } from '@/lib/blocks';
import { createNode } from '@/lib/registry';
import { createDataSource, sourceNameError, uniqueSourceName } from '@/lib/mockData';
import type { BuilderNode, DataSource, ProjectTheme } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import {
  type DropTarget,
  cloneNode,
  duplicateNode,
  findNode,
  insertNode,
  isWithin,
  moveNode,
  nudgeNode,
  removeNode,
  resolveDrop,
  updateNodeProps,
} from '@/lib/tree';

export const ROOT_ID = 'root';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

export function createRoot(): BuilderNode {
  return {
    id: ROOT_ID,
    component: 'Flex',
    props: { vertical: true, gap: 'middle' },
    children: [],
  };
}

/** The undoable part of the editor state. */
export interface HistoryEntry {
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: DataSource[];
}

const snapshot = ({ root, theme, mockData }: HistoryEntry): HistoryEntry => ({
  root,
  theme,
  mockData,
});

export const HISTORY_LIMIT = 100;
/** Edits with the same coalesce key closer together than this become one undo step. */
export const COALESCE_MS = 1000;

export interface EditorState {
  name: string;
  /** Root of the page being edited. It is fixed: it can't be moved or removed. */
  root: BuilderNode;
  theme: ProjectTheme;
  /** Sample API responses that props can be bound to. */
  mockData: DataSource[];
  selectedId: string | null;
  /** Undo stack, oldest first. */
  past: HistoryEntry[];
  /** Redo stack, most recently undone last. */
  future: HistoryEntry[];
  /** Last recorded edit, so bursts of the same edit (typing, color dragging) coalesce. */
  lastEdit: { key: string; at: number } | null;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  /** Adds a new registry component at `target` and selects it. Returns the new node's id. */
  addNode: (component: string, target: DropTarget) => string;
  moveNode: (id: string, target: DropTarget) => void;
  /**
   * Inserts a ready-made block at `target` and selects it, adding its data source unless one
   * with the same name exists, as one undo step. Returns the block's root id.
   */
  insertBlock: (blockId: string, target: DropTarget) => string | null;
  removeNode: (id: string) => void;
  /** Moves a node one place up (`-1`) or down (`1`) among its siblings. */
  nudgeNode: (id: string, delta: -1 | 1) => void;
  /** Copies a node (and its subtree) right after itself and selects the copy. */
  duplicateNode: (id: string) => void;
  /** Copied subtree, a snapshot taken at copy time. Not part of the project or the history. */
  clipboard: BuilderNode | null;
  /** Puts a copy of node `id` on the clipboard. The root can't be copied. */
  copyNode: (id: string) => void;
  /** Copies node `id` to the clipboard and removes it. */
  cutNode: (id: string) => void;
  /**
   * Pastes a fresh copy of the clipboard into the selected node if it accepts it, otherwise
   * right after it (the page root when nothing is selected), and selects it. Returns the new
   * node's id, or `null` when there is nothing to paste or no valid place for it.
   */
  pasteNode: () => string | null;
  /**
   * Merges `patch` into a node's props; `undefined` values remove the prop.
   * With `coalesce`, quick successive edits of the same props become one undo step (typing).
   */
  updateProps: (
    id: string,
    patch: Readonly<Record<string, unknown>>,
    options?: { coalesce?: boolean },
  ) => void;
  setThemeMode: (mode: ProjectTheme['mode']) => void;
  setCompact: (compact: boolean) => void;
  /** Overrides a seed token; `undefined` restores antd's default. */
  setThemeToken: (key: string, value: string | number | undefined) => void;
  resetTheme: () => void;
  setName: (name: string) => void;
  /** Whether the keyboard shortcut reference is open. */
  shortcutHelpOpen: boolean;
  /** Canvas width preset. Editor UI state: not part of the project or the history. */
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  /** Shows the page as users see it: no panels, selection or drag and drop. */
  previewMode: boolean;
  /** Entering preview clears the selection. */
  setPreviewMode: (on: boolean) => void;
  setShortcutHelpOpen: (open: boolean) => void;
  /** Replaces the whole project (e.g. after opening a file); clears the selection and history. */
  /** Adds a data source with sample data and a free name based on `name`. Returns its id. */
  addDataSource: (name?: string) => string;
  /**
   * Renames a data source or replaces its data. Invalid or taken names are ignored. With
   * `coalesce`, quick successive data edits become one undo step (typing).
   */
  updateDataSource: (
    id: string,
    patch: Partial<Pick<DataSource, 'name' | 'data'>>,
    options?: { coalesce?: boolean },
  ) => void;
  removeDataSource: (id: string) => void;
  loadProject: (content: {
    name: string;
    root: BuilderNode;
    theme: ProjectTheme;
    mockData?: DataSource[];
  }) => void;
}

export const DEFAULT_PROJECT_NAME = 'Untitled project';

/**
 * Applies an undoable change: records the current root and theme on the undo stack and drops the
 * redo stack. No-op changes are not recorded; an edit with the same `coalesceKey` as the previous
 * one, made within `COALESCE_MS`, extends that undo step instead of adding a new one.
 */
function commit(
  state: EditorState,
  next: Partial<HistoryEntry> & Partial<Pick<EditorState, 'selectedId'>>,
  coalesceKey?: string,
): Partial<EditorState> {
  const root = next.root ?? state.root;
  const theme = next.theme ?? state.theme;
  const mockData = next.mockData ?? state.mockData;
  if (root === state.root && theme === state.theme && mockData === state.mockData) return state;

  const now = Date.now();
  const { lastEdit } = state;
  const coalesce =
    coalesceKey !== undefined &&
    lastEdit?.key === coalesceKey &&
    now - lastEdit.at < COALESCE_MS &&
    state.past.length > 0;
  return {
    ...next,
    past: coalesce ? state.past : [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
    lastEdit: coalesceKey === undefined ? null : { key: coalesceKey, at: now },
  };
}

/** Restores a history entry, keeping the selection only if that node still exists. */
function restore(state: EditorState, entry: HistoryEntry): Partial<EditorState> {
  const keepSelection = state.selectedId && findNode(entry.root, state.selectedId);
  return {
    ...snapshot(entry),
    selectedId: keepSelection ? state.selectedId : null,
    lastEdit: null,
  };
}

/** Inserts `node` at `target` and selects it, as one undo step. */
function insertAndSelect(state: EditorState, node: BuilderNode, target: DropTarget) {
  return commit(state, { root: insertNode(state.root, node, target), selectedId: node.id });
}

/** Applies a theme change, skipping it when no value actually changes. */
function commitTheme(
  state: EditorState,
  patch: Partial<ProjectTheme>,
  coalesceKey?: string,
): Partial<EditorState> {
  const theme = { ...state.theme, ...patch };
  const unchanged = JSON.stringify(theme) === JSON.stringify(state.theme);
  return unchanged ? state : commit(state, { theme }, coalesceKey);
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  name: DEFAULT_PROJECT_NAME,
  root: createRoot(),
  theme: createTheme(),
  mockData: [],
  selectedId: null,
  past: [],
  future: [],
  lastEdit: null,
  undo: () =>
    set((state) => {
      const entry = state.past.at(-1);
      if (!entry) return state;
      return {
        ...restore(state, entry),
        past: state.past.slice(0, -1),
        future: [...state.future, snapshot(state)],
      };
    }),
  redo: () =>
    set((state) => {
      const entry = state.future.at(-1);
      if (!entry) return state;
      return {
        ...restore(state, entry),
        past: [...state.past, snapshot(state)],
        future: state.future.slice(0, -1),
      };
    }),
  select: (id) => set({ selectedId: id }),
  addNode: (component, target) => {
    const node = createNode(component);
    set((state) => insertAndSelect(state, node, target));
    return node.id;
  },
  insertBlock: (blockId, target) => {
    const block = getBlock(blockId);
    if (!block) return null;
    const { mockData } = get();
    const existing = block.data && mockData.find((source) => source.name === block.data!.name);
    const added =
      block.data && !existing
        ? createDataSource(block.data.name, structuredClone(block.data.data))
        : undefined;
    const node = block.build((existing ?? added)?.id ?? '');
    set((state) =>
      commit(state, {
        root: insertNode(state.root, node, target),
        selectedId: node.id,
        ...(added && { mockData: [...state.mockData, added] }),
      }),
    );
    return node.id;
  },
  moveNode: (id, target) => {
    if (id === ROOT_ID) return;
    set((state) => commit(state, { root: moveNode(state.root, id, target) }));
  },
  nudgeNode: (id, delta) =>
    set((state) => commit(state, { root: nudgeNode(state.root, id, delta) })),
  removeNode: (id) => {
    if (id === ROOT_ID) return;
    set((state) =>
      commit(state, {
        root: removeNode(state.root, id),
        selectedId:
          state.selectedId && isWithin(state.root, id, state.selectedId) ? null : state.selectedId,
      }),
    );
  },
  duplicateNode: (id) =>
    set((state) => {
      const result = duplicateNode(state.root, id);
      return result ? commit(state, { root: result.root, selectedId: result.id }) : state;
    }),
  clipboard: null,
  copyNode: (id) => {
    const node = id === ROOT_ID ? undefined : findNode(get().root, id);
    if (node) set({ clipboard: structuredClone(node) });
  },
  cutNode: (id) => {
    get().copyNode(id);
    get().removeNode(id);
  },
  pasteNode: () => {
    const { clipboard, root, selectedId } = get();
    if (!clipboard) return null;
    const anchor = selectedId && findNode(root, selectedId) ? selectedId : ROOT_ID;
    const target = resolveDrop(root, [anchor], clipboard.component);
    if (!target) return null;
    const node = cloneNode(clipboard);
    set((state) => insertAndSelect(state, node, target));
    return node.id;
  },
  updateProps: (id, patch, options) =>
    set((state) =>
      commit(
        state,
        { root: updateNodeProps(state.root, id, patch) },
        options?.coalesce ? `props:${id}:${Object.keys(patch).sort().join(',')}` : undefined,
      ),
    ),
  setThemeMode: (mode) => set((state) => commitTheme(state, { mode })),
  setCompact: (compact) => set((state) => commitTheme(state, { compact })),
  setThemeToken: (key, value) =>
    set((state) => {
      const token = { ...state.theme.token };
      if (value === undefined) delete token[key];
      else token[key] = value;
      return commitTheme(state, { token }, `token:${key}`);
    }),
  resetTheme: () => set((state) => commitTheme(state, createTheme())),
  setName: (name) => set({ name }),
  shortcutHelpOpen: false,
  viewport: 'desktop',
  setViewport: (viewport) => set({ viewport }),
  previewMode: false,
  setPreviewMode: (on) =>
    set(on ? { previewMode: true, selectedId: null } : { previewMode: false }),
  setShortcutHelpOpen: (open) => set({ shortcutHelpOpen: open }),
  addDataSource: (name = 'data') => {
    const names = get().mockData.map((source) => source.name);
    const source = createDataSource(uniqueSourceName(name, names));
    set((state) => commit(state, { mockData: [...state.mockData, source] }));
    return source.id;
  },
  updateDataSource: (id, patch, options) =>
    set((state) => {
      const source = state.mockData.find((candidate) => candidate.id === id);
      if (!source) return state;
      if (patch.name !== undefined && patch.name !== source.name) {
        const others = state.mockData.filter((other) => other.id !== id).map((o) => o.name);
        if (sourceNameError(patch.name, others)) return state;
      }
      const next = { ...source, ...patch };
      if (JSON.stringify(next) === JSON.stringify(source)) return state;
      const mockData = state.mockData.map((candidate) => (candidate.id === id ? next : candidate));
      const key = options?.coalesce
        ? `data:${id}:${Object.keys(patch).sort().join(',')}`
        : undefined;
      return commit(state, { mockData }, key);
    }),
  removeDataSource: (id) =>
    set((state) => {
      const mockData = state.mockData.filter((source) => source.id !== id);
      return mockData.length === state.mockData.length ? state : commit(state, { mockData });
    }),
  loadProject: ({ name, root, theme, mockData = [] }) =>
    set({ name, root, theme, mockData, selectedId: null, past: [], future: [], lastEdit: null }),
}));
