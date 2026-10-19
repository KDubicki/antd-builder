import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from 'antd';
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { findNode } from '@/lib/tree';
import { Inspector } from './Inspector';

const select = (node: BuilderNode) =>
  useEditorStore.setState({ root: { ...createRoot(), children: [node] }, selectedId: node.id });

const propsOf = (id: string) => findNode(useEditorStore.getState().root, id)?.props;

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    selectedId: null,
    past: [],
    future: [],
    lastEdit: null,
    customBlocks: [],
  }),
);

describe('Inspector', () => {
  it('asks for a selection when nothing is selected', () => {
    render(<Inspector />);
    expect(screen.getByText(/Select a component on the canvas/)).toBeInTheDocument();
  });

  it('renders a field for every prop in the registry', () => {
    select(createNode('Button', 'btn'));
    render(<Inspector />);
    expect(screen.getByRole('heading', { name: 'Button' })).toBeInTheDocument();
    for (const label of ['Label', 'Type', 'Size', 'Danger', 'Full width', 'Disabled']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Label')).toHaveValue('Button');
  });

  it('edits string props and removes them when cleared', () => {
    select(createNode('Button', 'btn'));
    render(<Inspector />);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Save' } });
    expect(propsOf('btn')?.children).toBe('Save');
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '' } });
    expect(propsOf('btn')).not.toHaveProperty('children');
  });

  it('undoes a burst of typing as one step', () => {
    select(createNode('Button', 'btn'));
    render(<Inspector />);
    const label = screen.getByLabelText('Label');
    fireEvent.change(label, { target: { value: 'S' } });
    fireEvent.change(label, { target: { value: 'Save' } });
    fireEvent.click(screen.getByLabelText('Danger'));
    expect(useEditorStore.getState().past).toHaveLength(2);
    useEditorStore.getState().undo();
    useEditorStore.getState().undo();
    expect(propsOf('btn')?.children).toBe('Button');
  });

  it('edits multiline text', () => {
    select(createNode('Typography.Paragraph', 'p'));
    render(<Inspector />);
    const field = screen.getByLabelText('Text');
    expect(field.tagName).toBe('TEXTAREA');
    fireEvent.change(field, { target: { value: 'Line 1\nLine 2' } });
    expect(propsOf('p')?.children).toBe('Line 1\nLine 2');
  });

  it('toggles boolean props, dropping them when off', () => {
    select(createNode('Button', 'btn'));
    render(<Inspector />);
    fireEvent.click(screen.getByLabelText('Danger'));
    expect(propsOf('btn')?.danger).toBe(true);
    fireEvent.click(screen.getByLabelText('Danger'));
    expect(propsOf('btn')).not.toHaveProperty('danger');
  });

  it('edits number props', () => {
    select(createNode('Col', 'col'));
    render(<Inspector />);
    const span = screen.getByLabelText('Span');
    expect(span).toHaveValue('12');
    fireEvent.change(span, { target: { value: '6' } });
    expect(propsOf('col')?.span).toBe(6);
    fireEvent.change(span, { target: { value: '' } });
    expect(propsOf('col')).not.toHaveProperty('span');
  });

  it('picks enum values from a select', () => {
    select(createNode('Button', 'btn'));
    render(<Inspector />);
    fireEvent.mouseDown(screen.getByLabelText('Type'));
    fireEvent.click(within(document.body).getByTitle('dashed'));
    expect(propsOf('btn')?.type).toBe('dashed');
  });

  it('deletes the selected component', () => {
    select(createNode('Tag', 'tag'));
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete component' }));
    expect(useEditorStore.getState().root.children).toEqual([]);
    expect(screen.getByText(/Select a component on the canvas/)).toBeInTheDocument();
  });

  it('duplicates the selected component and selects the copy', () => {
    select({ ...createNode('Tag', 'tag'), props: { children: 'New' } });
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate component' }));
    const [original, copy] = useEditorStore.getState().root.children;
    expect(original?.id).toBe('tag');
    expect(copy).toMatchObject({ component: 'Tag', props: { children: 'New' } });
    expect(useEditorStore.getState().selectedId).toBe(copy?.id);
  });

  it('edits JSON props, keeping invalid drafts off the node', () => {
    select(createNode('Breadcrumb', 'bc'));
    render(<Inspector />);
    const field = screen.getByLabelText('Items');
    expect(JSON.parse((field as HTMLTextAreaElement).value)).toEqual(propsOf('bc')?.items);

    fireEvent.change(field, { target: { value: '[{"title":"Home"}]' } });
    expect(propsOf('bc')?.items).toEqual([{ title: 'Home' }]);

    fireEvent.change(field, { target: { value: '[{"title":' } });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(propsOf('bc')?.items).toEqual([{ title: 'Home' }]);
    fireEvent.blur(field); // an invalid draft stays for the user to fix
    expect(field).toHaveValue('[{"title":');

    fireEvent.change(field, { target: { value: '[]' } });
    expect(field).toHaveAttribute('aria-invalid', 'false');
    fireEvent.blur(field); // a valid draft is reformatted from the node
    expect(field).toHaveValue('[]');

    fireEvent.change(field, { target: { value: '  ' } });
    expect(propsOf('bc')).not.toHaveProperty('items');
    fireEvent.blur(field);
    expect(field).toHaveValue('');
  });

  it('shows JSON changes made elsewhere (e.g. undo) when not editing', () => {
    select(createNode('Breadcrumb', 'bc'));
    render(<Inspector />);
    act(() => useEditorStore.getState().updateProps('bc', { items: [{ title: 'X' }] }));
    expect(JSON.parse((screen.getByLabelText('Items') as HTMLTextAreaElement).value)).toEqual([
      { title: 'X' },
    ]);
  });

  it('stores booleans that differ from a true antd default', () => {
    select(createNode('Anchor', 'a'));
    render(<Inspector />);
    const affix = screen.getByLabelText('Stick on scroll');
    expect(affix).not.toBeChecked(); // registry default: false
    fireEvent.click(affix);
    expect(propsOf('a')).not.toHaveProperty('affix'); // true is antd's default
    expect(affix).toBeChecked();
    fireEvent.click(affix);
    expect(propsOf('a')?.affix).toBe(false);
  });

  it('moves the selected component among its siblings', () => {
    useEditorStore.setState({
      root: { ...createRoot(), children: [createNode('Tag', 'a'), createNode('Tag', 'b')] },
      selectedId: 'a',
    });
    render(<Inspector />);
    const up = screen.getByRole('button', { name: 'Move up' });
    const down = screen.getByRole('button', { name: 'Move down' });
    const order = () => useEditorStore.getState().root.children.map((c) => c.id);
    expect(up).toBeDisabled();
    expect(down).toBeEnabled();

    fireEvent.click(down);
    expect(order()).toEqual(['b', 'a']);
    expect(up).toBeEnabled();
    expect(down).toBeDisabled();

    fireEvent.click(up);
    expect(order()).toEqual(['a', 'b']);
  });

  it('wraps the selected component in a container and unwraps it', async () => {
    select(createNode('Tag', 'tag'));
    render(<Inspector />);
    fireEvent.click(screen.getByRole('button', { name: 'Wrap or unwrap' }));
    expect(await screen.findByRole('menuitem', { name: /Unwrap/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Wrap in Card/ }));
    const [card] = useEditorStore.getState().root.children;
    expect(card).toMatchObject({ component: 'Card', children: [{ id: 'tag' }] });
    expect(screen.getByRole('heading', { name: 'Card' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wrap or unwrap' }));
    const unwrap = (await screen.findAllByRole('menuitem', { name: /Unwrap/ })).at(-1)!;
    expect(unwrap).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(unwrap);
    expect(useEditorStore.getState().root.children.map((c) => c.id)).toEqual(['tag']);
  });

  it('shows where the component sits and selects its ancestors', () => {
    const tag = createNode('Tag', 'tag');
    select({ ...createNode('Card', 'card'), children: [tag] });
    useEditorStore.setState({ selectedId: 'tag' });
    render(<Inspector />);
    const path = screen.getByRole('navigation', { name: 'Component path' });
    expect(path).toHaveTextContent('Page/Card/Tag');
    expect(within(path).queryByRole('button', { name: 'Tag' })).not.toBeInTheDocument();

    fireEvent.click(within(path).getByRole('button', { name: 'Card' }));
    expect(useEditorStore.getState().selectedId).toBe('card');
    fireEvent.click(within(path).getByRole('button', { name: 'Page' }));
    expect(useEditorStore.getState().selectedId).toBe(ROOT_ID);
    expect(screen.queryByRole('navigation', { name: 'Component path' })).not.toBeInTheDocument();
  });

  it('saves the selected component as a named block', async () => {
    select(createNode('Card', 'card'));
    render(
      <App>
        <Inspector />
      </App>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save as block' }));
    const name = await screen.findByLabelText('Block name');
    expect(name).toHaveValue('Card');
    fireEvent.change(name, { target: { value: 'Hero card' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(useEditorStore.getState().customBlocks).toMatchObject([
      { name: 'Hero card', root: { id: 'card', component: 'Card' } },
    ]);
    expect(await screen.findByText('Saved to My blocks in the palette')).toBeInTheDocument();
  });

  it('edits the page root but does not offer to delete it', () => {
    useEditorStore.setState({ selectedId: ROOT_ID });
    render(<Inspector />);
    expect(screen.getByRole('heading', { name: 'Page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete component' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duplicate component' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save as block' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Wrap'));
    expect(propsOf(ROOT_ID)?.wrap).toBe(true);
  });
});
