import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('edits the page root but does not offer to delete it', () => {
    useEditorStore.setState({ selectedId: ROOT_ID });
    render(<Inspector />);
    expect(screen.getByRole('heading', { name: 'Page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete component' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duplicate component' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Wrap'));
    expect(propsOf(ROOT_ID)?.wrap).toBe(true);
  });
});
