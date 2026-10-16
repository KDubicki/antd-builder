'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { parseProject, toProject } from '@/lib/project';

export const AUTOSAVE_KEY = 'antd-builder:project';
const AUTOSAVE_DELAY_MS = 300;

/**
 * Restores the last project from localStorage on mount, then saves every change (debounced).
 * Storage can be unavailable (private mode, blocked site data); the editor works without it.
 */
export function useAutosave() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      const result = saved ? parseProject(saved) : null;
      if (result?.ok) useEditorStore.getState().loadProject(result.content);
    } catch {
      // Storage unavailable: start with an empty project.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      const unchanged =
        state.name === prev.name &&
        state.root === prev.root &&
        state.theme === prev.theme &&
        state.mockData === prev.mockData &&
        state.customBlocks === prev.customBlocks &&
        state.versions === prev.versions;
      if (unchanged) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(toProject(useEditorStore.getState())));
        } catch {
          // Storage full or unavailable: nothing to do.
        }
      }, AUTOSAVE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
