import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROJECT_NAME, useEditorStore } from '@/lib/editor/store';
import { toProject } from '@/lib/project';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { ProjectActions } from './ProjectActions';
import { createRoot } from '@/lib/tree';

const renderActions = () =>
  render(
    <App>
      <ProjectActions />
    </App>,
  );

const openFile = async (content: string) => {
  const file = new File([content], 'project.json', { type: 'application/json' });
  await act(async () => {
    fireEvent.change(screen.getByTestId('project-file-input'), { target: { files: [file] } });
  });
};

beforeEach(() => {
  useEditorStore.setState({
    name: 'Shop',
    root: { ...createRoot(), children: [createNode('Tag', 'tag')] },
    theme: createTheme(),
    selectedId: null,
  });
});

afterEach(() => vi.restoreAllMocks());

describe('ProjectActions', () => {
  it('renames the project and restores the default name when cleared', () => {
    renderActions();
    const input = screen.getByLabelText('Project name');
    fireEvent.change(input, { target: { value: 'Landing' } });
    expect(useEditorStore.getState().name).toBe('Landing');
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.blur(input);
    expect(useEditorStore.getState().name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('downloads the project as JSON', async () => {
    let saved: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob;
      return 'blob:project';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('shop.json');
      expect(this.href).toBe('blob:project');
    });

    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    expect(click).toHaveBeenCalledOnce();
    expect(JSON.parse(await saved!.text())).toEqual(toProject(useEditorStore.getState()));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:project'));
  });

  it('opens a valid project file', async () => {
    const root = { ...createRoot(), children: [createNode('Button', 'btn')] };
    renderActions();
    await openFile(
      JSON.stringify(
        toProject({ name: 'Opened', root, theme: { ...createTheme(), mode: 'dark' } }),
      ),
    );
    expect(useEditorStore.getState()).toMatchObject({
      name: 'Opened',
      root,
      theme: { mode: 'dark' },
    });
    expect(await screen.findByText('Opened "Opened"')).toBeInTheDocument();
  });

  it('reports invalid files and keeps the current project', async () => {
    const before = useEditorStore.getState().root;
    renderActions();
    await openFile('not json');
    expect(await screen.findByText('The file is not valid JSON.')).toBeInTheDocument();
    expect(useEditorStore.getState().root).toBe(before);
  });

  it('opens the file picker from the Open button', () => {
    renderActions();
    const click = vi.spyOn(screen.getByTestId('project-file-input'), 'click');
    fireEvent.click(screen.getByRole('button', { name: /Open/ }));
    expect(click).toHaveBeenCalledOnce();
  });

  it('starts a new project after confirming, keeping saved blocks', async () => {
    useEditorStore.setState({ customBlocks: [], versions: [], mockData: [], past: [] });
    useEditorStore.getState().saveAsBlock('tag', 'Promo');
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /New/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('"Shop" will be replaced by an empty page');

    fireEvent.click(screen.getByRole('button', { name: 'Start new' }));
    expect(await screen.findByText('Started a new project')).toBeInTheDocument();
    const state = useEditorStore.getState();
    expect(state).toMatchObject({ name: DEFAULT_PROJECT_NAME, past: [], versions: [] });
    expect(state.root).toEqual(createRoot());
    expect(state.customBlocks.map((block) => block.name)).toEqual(['Promo']);
  });

  it('keeps the project when starting over is cancelled', async () => {
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /New/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(useEditorStore.getState().name).toBe('Shop');
    expect(useEditorStore.getState().root.children).toHaveLength(1);
  });

  it('starts over without asking when there is nothing to lose', () => {
    useEditorStore.setState({ root: createRoot(), mockData: [], versions: [], past: [] });
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /New/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useEditorStore.getState().name).toBe(DEFAULT_PROJECT_NAME);
  });
});
