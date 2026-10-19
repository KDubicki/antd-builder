import { create } from 'zustand';
import { getBlock } from '@/lib/blocks';
import { createNode, getComponentMeta } from '@/lib/registry';
import { createDataSource, planTable, sourceNameError, uniqueSourceName } from '@/lib/mockData';
import type {
  BuilderNode,
  CustomBlock,
  DataSource,
  ProjectTheme,
  ProjectVersion,
} from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import {
  type History,
  type HistoryEntry,
  emptyHistory,
  record,
  redoStep,
  sameEntry,
  snapshot,
  undoStep,
} from './history';
import {
  ROOT_ID,
  type DropTarget,
  createRoot,
  cloneNode,
  duplicateNode,
  findNode,
  insertNode,
  isWithin,
  moveNode,
  nudgeNode,
  removeNode,
  resolveDrop,
  sameProps,
  unwrapNode,
  updateNodeProps,
  wrapNode,
} from '@/lib/tree';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

export { COALESCE_MS, HISTORY_LIMIT, type HistoryEntry } from './history';

export interface EditorState extends History {
  name: string;
  /** Root of the page being edited. It is fixed: it can't be moved or removed. */
  root: BuilderNode;
  theme: ProjectTheme;
  /** Sample API responses that props can be bound to. */
  mockData: DataSource[];
  /** Fragments saved by the user to reuse, listed under "My blocks". */
  customBlocks: CustomBlock[];
  /**
   * Saves a copy of node `id` (with its subtree) as a custom block named `name` (made unique;
   * defaults to the component's label). The root can't be saved. Returns the block's id.
   */
  saveAsBlock: (id: string, name?: string) => string | null;
  removeCustomBlock: (id: string) => void;
  /**
   * Named snapshots of the project, newest first. Saving and deleting them is not undoable
   * (undo should never delete a snapshot), but restoring one is.
   */
  versions: ProjectVersion[];
  /** Snapshots the current project as `name` (defaults to "Version N"). Returns its id. */
  saveVersion: (name?: string) => string;
  /** Replaces the project content with a version's, as one undo step. */
  restoreVersion: (id: string) => void;
  removeVersion: (id: string) => void;
  selectedId: string | null;
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
  /**
   * Appends a table showing a data source (columns from its fields, rows bound to it) to the
   * page and selects it. Returns its id, or `null` when the data holds no list of objects.
   */
  insertDataTable: (sourceId: string) => string | null;
  removeNode: (id: string) => void;
  /** Moves a node one place up (`-1`) or down (`1`) among its siblings. */
  nudgeNode: (id: string, delta: -1 | 1) => void;
  /** Copies a node (and its subtree) right after itself and selects the copy. */
  duplicateNode: (id: string) => void;
  /**
   * Puts node `id` inside a new `component` in its place and selects the wrapper. Returns the
   * wrapper's id, or `null` when nesting rules don't allow it.
   */
  wrapNode: (id: string, component: string) => string | null;
  /** Replaces node `id` with its children and selects the first, when nesting rules allow it. */
  unwrapNode: (id: string) => void;
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
  /** Puts a node's props back to its component's defaults, as one undo step. Not the root. */
  resetProps: (id: string) => void;
  setThemeMode: (mode: ProjectTheme['mode']) => void;
  setCompact: (compact: boolean) => void;
  /** Overrides a seed token; `undefined` restores antd's default. */
  setThemeToken: (key: string, value: string | number | undefined) => void;
  resetTheme: () => void;
  /** Replaces the whole theme, e.g. with a preset, as one undo step named `label`. */
  applyTheme: (theme: ProjectTheme, label: string) => void;
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
  /**
   * Adds a data source with a free name based on `name`, holding `init` (e.g. an imported API
   * response) or else sample data. Returns its id.
   */
  addDataSource: (name?: string, init?: Pick<DataSource, 'data' | 'url'>) => string;
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
  /**
   * Starts over with an empty, untitled project, keeping the saved blocks (they're the user's
   * own toolbox). Like opening a file, it clears the history and versions.
   */
  newProject: () => void;
  /** Replaces the whole project (e.g. after opening a file); clears the selection and history. */
  loadProject: (content: {
    name: string;
    root: BuilderNode;
    theme: ProjectTheme;
    mockData?: DataSource[];
    customBlocks?: CustomBlock[];
    versions?: ProjectVersion[];
  }) => void;
}

export const DEFAULT_PROJECT_NAME = 'Untitled project';

/**
 * Applies an undoable change named `label` (shown on the Undo and Redo buttons): records the
 * current content on the undo stack (see `record`). No-op changes are not recorded.
 */
function commit(
  state: EditorState,
  label: string,
  next: Partial<HistoryEntry> & Partial<Pick<EditorState, 'selectedId'>>,
  coalesceKey?: string,
): Partial<EditorState> {
  const content = { ...snapshot(state), ...next };
  if (sameEntry(state, content)) return state;
  return { ...next, ...record(state, state, label, coalesceKey) };
}

/** Node `id`, unless it is the page root (which can't be copied, saved or reset). */
function findNonRoot(root: BuilderNode, id: string): BuilderNode | undefined {
  return id === ROOT_ID ? undefined : findNode(root, id);
}

/** A node's component label, e.g. "Button", for naming edits. */
function labelOf(root: BuilderNode, id: string): string {
  const node = findNode(root, id);
  return node ? (getComponentMeta(node.component)?.label ?? node.component) : 'component';
}

/** Moves through the history, keeping the selection only if that node still exists. */
function travel(
  state: EditorState,
  step: { entry: HistoryEntry; history: History } | null,
): Partial<EditorState> {
  if (!step) return state;
  const { entry, history } = step;
  const keepSelection = state.selectedId && findNode(entry.root, state.selectedId);
  return { ...snapshot(entry), ...history, selectedId: keepSelection ? state.selectedId : null };
}

/** `name`, or `name 2`, `name 3`… whichever no other block uses. */
function uniqueBlockName(name: string, names: readonly string[]): string {
  if (!names.includes(name)) return name;
  let n = 2;
  while (names.includes(`${name} ${n}`)) n += 1;
  return `${name} ${n}`;
}

/** Inserts `node` at `target` and selects it, as one undo step. */
function insertAndSelect(
  state: EditorState,
  node: BuilderNode,
  target: DropTarget,
  label = `Add ${labelOf(node, node.id)}`,
) {
  return commit(state, label, {
    root: insertNode(state.root, node, target),
    selectedId: node.id,
  });
}

/** Applies a theme change, skipping it when no value actually changes. */
function commitTheme(
  state: EditorState,
  patch: Partial<ProjectTheme>,
  { label = 'Edit theme', coalesceKey }: { label?: string; coalesceKey?: string } = {},
): Partial<EditorState> {
  const theme = { ...state.theme, ...patch };
  const unchanged = JSON.stringify(theme) === JSON.stringify(state.theme);
  return unchanged ? state : commit(state, label, { theme }, coalesceKey);
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  name: DEFAULT_PROJECT_NAME,
  root: createRoot(),
  theme: createTheme(),
  mockData: [],
  customBlocks: [],
  versions: [],
  saveVersion: (name) => {
    const state = get();
    const version: ProjectVersion = {
      id: crypto.randomUUID(),
      name: name?.trim() || `Version ${state.versions.length + 1}`,
      createdAt: new Date().toISOString(),
      ...structuredClone(snapshot(state)),
    };
    set({ versions: [version, ...state.versions] });
    return version.id;
  },
  restoreVersion: (id) =>
    set((state) => {
      const version = state.versions.find((candidate) => candidate.id === id);
      if (!version) return state;
      const content = structuredClone(snapshot(version));
      const keepSelection = state.selectedId && findNode(content.root, state.selectedId);
      return commit(state, `Restore "${version.name}"`, {
        ...content,
        selectedId: keepSelection ? state.selectedId : null,
      });
    }),
  removeVersion: (id) =>
    set((state) => {
      const versions = state.versions.filter((version) => version.id !== id);
      return versions.length === state.versions.length ? state : { versions };
    }),
  selectedId: null,
  ...emptyHistory(),
  undo: () => set((state) => travel(state, undoStep(state, state))),
  redo: () => set((state) => travel(state, redoStep(state, state))),
  select: (id) => set({ selectedId: id }),
  addNode: (component, target) => {
    const node = createNode(component);
    set((state) => insertAndSelect(state, node, target));
    return node.id;
  },
  insertDataTable: (sourceId) => {
    const source = get().mockData.find((candidate) => candidate.id === sourceId);
    const plan = source ? planTable(source.id, source.data) : null;
    if (!plan) return null;
    const node = { ...createNode('Table'), props: { ...plan, horizontalScroll: true } };
    set((state) =>
      insertAndSelect(state, node, { parentId: ROOT_ID, index: state.root.children.length }),
    );
    return node.id;
  },
  insertBlock: (blockId, target) => {
    const custom = get().customBlocks.find((candidate) => candidate.id === blockId);
    if (custom) {
      const copy = cloneNode(custom.root);
      set((state) => insertAndSelect(state, copy, target, `Add ${custom.name}`));
      return copy.id;
    }
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
      commit(state, `Add ${block.label}`, {
        root: insertNode(state.root, node, target),
        selectedId: node.id,
        ...(added && { mockData: [...state.mockData, added] }),
      }),
    );
    return node.id;
  },
  moveNode: (id, target) => {
    if (id === ROOT_ID) return;
    set((state) =>
      commit(state, `Move ${labelOf(state.root, id)}`, { root: moveNode(state.root, id, target) }),
    );
  },
  nudgeNode: (id, delta) =>
    set((state) =>
      commit(state, `Move ${labelOf(state.root, id)}`, { root: nudgeNode(state.root, id, delta) }),
    ),
  removeNode: (id) => {
    if (id === ROOT_ID) return;
    set((state) =>
      commit(state, `Delete ${labelOf(state.root, id)}`, {
        root: removeNode(state.root, id),
        selectedId:
          state.selectedId && isWithin(state.root, id, state.selectedId) ? null : state.selectedId,
      }),
    );
  },
  duplicateNode: (id) =>
    set((state) => {
      const result = duplicateNode(state.root, id);
      if (!result) return state;
      return commit(state, `Duplicate ${labelOf(state.root, id)}`, {
        root: result.root,
        selectedId: result.id,
      });
    }),
  wrapNode: (id, component) => {
    const wrapper = createNode(component);
    const root = wrapNode(get().root, id, wrapper);
    if (!root) return null;
    set((state) =>
      commit(state, `Wrap ${labelOf(state.root, id)} in ${labelOf(wrapper, wrapper.id)}`, {
        root,
        selectedId: wrapper.id,
      }),
    );
    return wrapper.id;
  },
  unwrapNode: (id) =>
    set((state) => {
      const node = findNode(state.root, id);
      const root = node && unwrapNode(state.root, id);
      if (!node || !root) return state;
      return commit(state, `Unwrap ${labelOf(state.root, id)}`, {
        root,
        selectedId: node.children[0]!.id,
      });
    }),
  clipboard: null,
  copyNode: (id) => {
    const node = findNonRoot(get().root, id);
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
    set((state) => insertAndSelect(state, node, target, `Paste ${labelOf(node, node.id)}`));
    return node.id;
  },
  updateProps: (id, patch, options) =>
    set((state) =>
      commit(
        state,
        `Edit ${labelOf(state.root, id)}`,
        { root: updateNodeProps(state.root, id, patch) },
        options?.coalesce ? `props:${id}:${Object.keys(patch).sort().join(',')}` : undefined,
      ),
    ),
  resetProps: (id) =>
    set((state) => {
      const node = findNonRoot(state.root, id);
      const meta = node && getComponentMeta(node.component);
      if (!node || !meta || sameProps(node.props, meta.defaultProps)) return state;
      const defaults = structuredClone(meta.defaultProps);
      const cleared = Object.fromEntries(Object.keys(node.props).map((key) => [key, undefined]));
      return commit(state, `Reset ${meta.label}`, {
        root: updateNodeProps(state.root, id, { ...cleared, ...defaults }),
      });
    }),
  setThemeMode: (mode) => set((state) => commitTheme(state, { mode })),
  setCompact: (compact) => set((state) => commitTheme(state, { compact })),
  setThemeToken: (key, value) =>
    set((state) => {
      const token = { ...state.theme.token };
      if (value === undefined) delete token[key];
      else token[key] = value;
      return commitTheme(state, { token }, { coalesceKey: `token:${key}` });
    }),
  resetTheme: () => set((state) => commitTheme(state, createTheme(), { label: 'Reset theme' })),
  applyTheme: (theme, label) =>
    set((state) => commitTheme(state, structuredClone(theme), { label })),
  setName: (name) => set({ name }),
  shortcutHelpOpen: false,
  viewport: 'desktop',
  setViewport: (viewport) => set({ viewport }),
  previewMode: false,
  setPreviewMode: (on) =>
    set(on ? { previewMode: true, selectedId: null } : { previewMode: false }),
  setShortcutHelpOpen: (open) => set({ shortcutHelpOpen: open }),
  addDataSource: (name = 'data', init) => {
    const names = get().mockData.map((source) => source.name);
    const source = {
      ...createDataSource(uniqueSourceName(name, names), init?.data),
      ...(init?.url ? { url: init.url } : {}),
    };
    set((state) =>
      commit(state, `Add data source ${source.name}`, { mockData: [...state.mockData, source] }),
    );
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
      return commit(state, `Edit data source ${next.name}`, { mockData }, key);
    }),
  removeDataSource: (id) =>
    set((state) => {
      const source = state.mockData.find((candidate) => candidate.id === id);
      if (!source) return state;
      const mockData = state.mockData.filter((candidate) => candidate !== source);
      return commit(state, `Delete data source ${source.name}`, { mockData });
    }),
  saveAsBlock: (id, name) => {
    const node = findNonRoot(get().root, id);
    if (!node) return null;
    const base = name?.trim() || (getComponentMeta(node.component)?.label ?? node.component);
    const names = get().customBlocks.map((block) => block.name);
    const block: CustomBlock = {
      id: crypto.randomUUID(),
      name: uniqueBlockName(base, names),
      root: structuredClone(node),
    };
    set((state) =>
      commit(state, `Save block ${block.name}`, { customBlocks: [...state.customBlocks, block] }),
    );
    return block.id;
  },
  removeCustomBlock: (id) =>
    set((state) => {
      const block = state.customBlocks.find((candidate) => candidate.id === id);
      if (!block) return state;
      const customBlocks = state.customBlocks.filter((candidate) => candidate !== block);
      return commit(state, `Delete block ${block.name}`, { customBlocks });
    }),
  newProject: () =>
    get().loadProject({
      name: DEFAULT_PROJECT_NAME,
      root: createRoot(),
      theme: createTheme(),
      customBlocks: get().customBlocks,
    }),
  loadProject: ({ name, root, theme, mockData = [], customBlocks = [], versions = [] }) =>
    set({
      name,
      root,
      theme,
      mockData,
      customBlocks,
      versions,
      selectedId: null,
      ...emptyHistory(),
    }),
}));
