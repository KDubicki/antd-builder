import type { EditorState } from '@/lib/editor/store';

/** Whether there's anything to lose by replacing the project (New, a template). */
export function hasWork(state: EditorState): boolean {
  return (
    state.root.children.length > 0 ||
    state.mockData.length > 0 ||
    state.versions.length > 0 ||
    state.past.length > 0
  );
}
