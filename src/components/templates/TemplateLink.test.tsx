import { act, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { createRoot } from '@/lib/tree';
import { TemplateLink } from './TemplateLink';

const openAt = (search: string) => window.history.replaceState(null, '', `/${search}`);

const renderLink = async () => {
  render(
    <App>
      <TemplateLink />
    </App>,
  );
  // The template applies after the rest of the render's effects.
  await act(async () => vi.runOnlyPendingTimersAsync());
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  useEditorStore.setState({
    name: 'Mine',
    root: createRoot(),
    theme: createTheme(),
    mockData: [],
    versions: [],
    past: [],
    future: [],
  });
});
afterEach(() => {
  vi.useRealTimers();
  openAt('');
});

describe('TemplateLink', () => {
  it('starts from the linked template and drops the parameter', async () => {
    openAt('?template=landing&utm=x');
    await renderLink();
    expect(useEditorStore.getState().name).toBe('Landing page');
    expect(window.location.search).toBe('?utm=x');
  });

  it('asks before replacing work', async () => {
    useEditorStore.setState({ root: { ...createRoot(), children: [createNode('Tag', 'tag')] } });
    openAt('?template=landing');
    await renderLink();
    expect(await screen.findByText(/"Mine" will be replaced/)).toBeInTheDocument();
    expect(useEditorStore.getState().name).toBe('Mine');
  });

  it('reports an unknown template', async () => {
    openAt('?template=nope');
    await renderLink();
    expect(await screen.findByText('There is no "nope" template')).toBeInTheDocument();
    expect(useEditorStore.getState().name).toBe('Mine');
    expect(window.location.search).toBe('');
  });

  it('does nothing without a link', async () => {
    await renderLink();
    expect(useEditorStore.getState().name).toBe('Mine');
  });
});
