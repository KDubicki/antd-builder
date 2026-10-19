import { describe, expect, it } from 'vitest';
import { createTheme } from '@/lib/theme';
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  type HistoryEntry,
  emptyHistory,
  record,
  redoStep,
  sameEntry,
  snapshot,
  undoStep,
} from './history';

const entry = (id: string): HistoryEntry => ({
  root: { id, component: 'Flex', props: {}, children: [] },
  theme: createTheme(),
  mockData: [],
  customBlocks: [],
});

describe('history', () => {
  it('snapshots only the undoable fields', () => {
    const state = { ...entry('a'), name: 'Shop', selectedId: 'x' };
    expect(Object.keys(snapshot(state)).sort()).toEqual([
      'customBlocks',
      'mockData',
      'root',
      'theme',
    ]);
  });

  it('compares entries by identity', () => {
    const a = entry('a');
    expect(sameEntry(a, { ...a })).toBe(true);
    expect(sameEntry(a, { ...a, root: { ...a.root } })).toBe(false);
  });

  it('records edits, dropping the redo stack', () => {
    const a = entry('a');
    const history = record(
      { ...emptyHistory(), future: [{ ...entry('z'), label: 'x' }] },
      a,
      'Add',
    );
    expect(history).toEqual({ past: [{ ...a, label: 'Add' }], future: [], lastEdit: null });
  });

  it('coalesces quick edits with the same key', () => {
    const first = record(emptyHistory(), entry('a'), 'Edit text', 'typing', 0);
    const second = record(first, entry('b'), 'Edit again', 'typing', COALESCE_MS - 1);
    expect(second.past).toEqual([{ ...entry('a'), label: 'Edit text' }]);
    expect(second.lastEdit).toEqual({ key: 'typing', at: COALESCE_MS - 1 });

    const later = record(second, entry('c'), 'Edit text', 'typing', 2 * COALESCE_MS);
    expect(later.past).toHaveLength(2);
    expect(record(later, entry('d'), 'Edit', 'other', 2 * COALESCE_MS).past).toHaveLength(3);
  });

  it('keeps at most HISTORY_LIMIT steps', () => {
    let history = emptyHistory();
    for (let i = 0; i <= HISTORY_LIMIT; i++) history = record(history, entry(String(i)), 'Edit');
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]!.root.id).toBe('1');
  });

  it('undoes and redoes, keeping the step label', () => {
    const a = entry('a');
    const b = entry('b');
    const history = record(emptyHistory(), a, 'Add Button');
    expect(redoStep(history, b)).toBeNull();

    const back = undoStep(history, b)!;
    expect(snapshot(back.entry)).toEqual(a);
    expect(back.history).toEqual({
      past: [],
      future: [{ ...b, label: 'Add Button' }],
      lastEdit: null,
    });
    expect(undoStep(back.history, a)).toBeNull();

    const forward = redoStep(back.history, a)!;
    expect(snapshot(forward.entry)).toEqual(b);
    expect(forward.history).toEqual({
      past: [{ ...a, label: 'Add Button' }],
      future: [],
      lastEdit: null,
    });
  });
});
