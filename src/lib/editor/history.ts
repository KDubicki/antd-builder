import type { BuilderNode, CustomBlock, DataSource, ProjectTheme } from '@/lib/schema';

/** The undoable part of the editor state. */
export interface HistoryEntry {
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: DataSource[];
  customBlocks: CustomBlock[];
}

/** Undo and redo stacks, plus what's needed to coalesce bursts of the same edit. */
export interface History {
  /** Undo stack, oldest first. */
  past: HistoryEntry[];
  /** Redo stack, most recently undone last. */
  future: HistoryEntry[];
  /** Last recorded edit, so bursts of the same edit (typing, color dragging) coalesce. */
  lastEdit: { key: string; at: number } | null;
}

export const HISTORY_LIMIT = 100;
/** Edits with the same coalesce key closer together than this become one undo step. */
export const COALESCE_MS = 1000;

export const emptyHistory = (): History => ({ past: [], future: [], lastEdit: null });

/** The undoable fields of `state`, without anything else it holds. */
export const snapshot = ({ root, theme, mockData, customBlocks }: HistoryEntry): HistoryEntry => ({
  root,
  theme,
  mockData,
  customBlocks,
});

/** Whether `next` holds exactly the same content objects as `current`. */
export function sameEntry(current: HistoryEntry, next: HistoryEntry): boolean {
  return (
    current.root === next.root &&
    current.theme === next.theme &&
    current.mockData === next.mockData &&
    current.customBlocks === next.customBlocks
  );
}

/**
 * The history after an edit away from `current`: `current` goes on the undo stack and the redo
 * stack is dropped. An edit with the same `coalesceKey` as the previous one, made within
 * `COALESCE_MS`, extends that undo step instead of adding a new one.
 */
export function record(
  history: History,
  current: HistoryEntry,
  coalesceKey?: string,
  now = Date.now(),
): History {
  const { lastEdit, past } = history;
  const coalesce =
    coalesceKey !== undefined &&
    lastEdit?.key === coalesceKey &&
    now - lastEdit.at < COALESCE_MS &&
    past.length > 0;
  return {
    past: coalesce ? past : [...past, snapshot(current)].slice(-HISTORY_LIMIT),
    future: [],
    lastEdit: coalesceKey === undefined ? null : { key: coalesceKey, at: now },
  };
}

/** Steps back from `current`: the entry to restore and the new history, or `null` at the start. */
export function undoStep(
  history: History,
  current: HistoryEntry,
): { entry: HistoryEntry; history: History } | null {
  const entry = history.past.at(-1);
  if (!entry) return null;
  return {
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, snapshot(current)],
      lastEdit: null,
    },
  };
}

/** Steps forward from `current`, or `null` when nothing was undone. */
export function redoStep(
  history: History,
  current: HistoryEntry,
): { entry: HistoryEntry; history: History } | null {
  const entry = history.future.at(-1);
  if (!entry) return null;
  return {
    entry,
    history: {
      past: [...history.past, snapshot(current)],
      future: history.future.slice(0, -1),
      lastEdit: null,
    },
  };
}
