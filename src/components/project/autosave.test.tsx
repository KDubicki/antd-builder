import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROJECT_NAME, createRoot, useEditorStore } from '@/lib/editor/store';
import { toProject } from '@/lib/project';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { AUTOSAVE_KEY, useAutosave } from './autosave';

const savedProject = () => JSON.parse(localStorage.getItem(AUTOSAVE_KEY) ?? 'null');

beforeEach(() => {
  vi.useFakeTimers();
  useEditorStore.setState({
    name: DEFAULT_PROJECT_NAME,
    root: createRoot(),
    theme: createTheme(),
    mockData: [],
    customBlocks: [],
    selectedId: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAutosave', () => {
  it('restores the saved project on mount', () => {
    const root = { ...createRoot(), children: [createNode('Tag', 't')] };
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify(toProject({ name: 'Saved', root, theme: createTheme() })),
    );
    renderHook(() => useAutosave());
    expect(useEditorStore.getState()).toMatchObject({ name: 'Saved', root });
  });

  it('ignores invalid saved data', () => {
    localStorage.setItem(AUTOSAVE_KEY, '{"broken"');
    renderHook(() => useAutosave());
    expect(useEditorStore.getState().name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('saves project changes after a short delay', () => {
    const { unmount } = renderHook(() => useAutosave());
    act(() => useEditorStore.getState().setName('Draft'));
    expect(savedProject()).toBeNull();
    act(() => vi.runAllTimers());
    expect(savedProject()).toMatchObject({ name: 'Draft' });

    // Selection changes are not project changes.
    localStorage.clear();
    act(() => {
      useEditorStore.getState().select('x');
      vi.runAllTimers();
    });
    expect(savedProject()).toBeNull();

    // After unmount nothing is written.
    unmount();
    act(() => {
      useEditorStore.getState().setName('Later');
      vi.runAllTimers();
    });
    expect(savedProject()).toBeNull();
  });

  it('saves mock data changes', () => {
    renderHook(() => useAutosave());
    act(() => {
      useEditorStore.getState().addDataSource('users');
    });
    act(() => vi.runAllTimers());
    expect(savedProject().mockData).toMatchObject([{ name: 'users' }]);
  });

  it('saves custom blocks', () => {
    useEditorStore.setState({ root: { ...createRoot(), children: [createNode('Tag', 't')] } });
    renderHook(() => useAutosave());
    act(() => {
      useEditorStore.getState().saveAsBlock('t', 'Badge');
    });
    act(() => vi.runAllTimers());
    expect(savedProject().customBlocks).toMatchObject([{ name: 'Badge' }]);
  });

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderHook(() => useAutosave());
    act(() => {
      useEditorStore.getState().setName('Offline');
      vi.runAllTimers();
    });
    expect(useEditorStore.getState().name).toBe('Offline');
  });
});
