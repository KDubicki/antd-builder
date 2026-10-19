import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
// antd and rc-component print each warning once per session; reset so every suite sees its own.
import { resetWarned } from 'antd/es/_util/warning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Inspector } from '@/components/inspector/Inspector';
import { nodeToJsx } from '@/lib/codegen';
import { useEditorStore } from '@/lib/editor/store';
import {
  type ComponentMeta,
  type PropDefinition,
  canContain,
  components,
  createNode,
  createPlaceableNode,
} from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import { createRoot, findNode, updateNodeProps } from '@/lib/tree';
import { Canvas } from './Canvas';

/**
 * One suite per registry component: it must render on the canvas with its defaults and with
 * every inspector value, without React or antd warnings (antd reports deprecated props that
 * way), get an inspector field per prop, and export to JSX.
 */

const SUBJECT = 'subject';

function replaceChildren(node: BuilderNode, id: string, children: BuilderNode[]): BuilderNode {
  if (node.id === id) return { ...node, children };
  return { ...node, children: node.children.map((child) => replaceChildren(child, id, children)) };
}

/** Values the inspector can produce for a prop, beyond the default. */
function sampleValues(def: PropDefinition, fallback: unknown): unknown[] {
  switch (def.type) {
    case 'string':
      return ['Sample text'];
    case 'number':
      return [def.min ?? 1, def.max ?? 10].filter((v, i, all) => all.indexOf(v) === i);
    case 'boolean':
      return [!(def.default ?? false)];
    case 'enum':
      return [...def.options];
    case 'json':
      return fallback === undefined ? [] : [fallback];
  }
}

function placeSubject(meta: ComponentMeta, props: Record<string, unknown> = {}): BuilderNode {
  const placed = createPlaceableNode(meta.name, SUBJECT);
  return updateNodeProps(placed, SUBJECT, props);
}

function setPage(meta: ComponentMeta, props?: Record<string, unknown>) {
  useEditorStore.setState({
    root: { ...createRoot(), children: [placeSubject(meta, props)] },
    theme: createTheme(),
    selectedId: SUBJECT,
  });
}

const renderCanvas = () =>
  render(
    <DndContext>
      <Canvas />
    </DndContext>,
  );

let warnings: string[] = [];
beforeEach(() => {
  warnings = [];
  resetWarned();
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
});
afterEach(() => vi.restoreAllMocks());

describe.each(components.map((meta) => [meta.name, meta] as const))('%s', (_name, meta) => {
  it('renders on the canvas with its default props', () => {
    setPage(meta);
    const { container } = renderCanvas();
    expect(container.querySelector(`[data-node-id="${SUBJECT}"] > *`)).not.toBeNull();
    expect(screen.queryByText(/Unknown component/)).not.toBeInTheDocument();
    expect(warnings).toEqual([]);
  });

  it('renders every value the inspector can set', () => {
    for (const [key, def] of Object.entries(meta.props)) {
      for (const value of sampleValues(def, meta.defaultProps[key])) {
        setPage(meta, { [key]: value });
        const { container, unmount } = renderCanvas();
        expect(
          container.querySelector(`[data-node-id="${SUBJECT}"]`),
          `${key}=${JSON.stringify(value)}`,
        ).not.toBeNull();
        unmount();
      }
    }
    expect(warnings).toEqual([]);
  });

  it.runIf(meta.children !== 'none')('renders with one and with several children', () => {
    // Prefer a plain Button; containers with a children list get their first allowed type.
    const childType = canContain(meta.name, 'Button')
      ? 'Button'
      : (meta.children as readonly string[])[0]!;
    const max = meta.maxChildren ?? 2;
    for (const count of [1, Math.min(2, max)]) {
      const kids = Array.from({ length: count }, (_, i) => createNode(childType, `kid-${i}`));
      const placed = createPlaceableNode(meta.name, SUBJECT);
      const subject = findNode(placed, SUBJECT)!;
      const root = { ...createRoot(), children: [replaceChildren(placed, subject.id, kids)] };
      useEditorStore.setState({ root, theme: createTheme(), selectedId: null });
      const { container, unmount } = renderCanvas();
      expect(container.querySelector('[data-node-id="kid-0"]'), `${count} children`).not.toBeNull();
      unmount();
    }
    expect(warnings).toEqual([]);
  });

  it('has an inspector field for every prop', () => {
    setPage(meta);
    const { container } = render(<Inspector />);
    expect(screen.getByRole('heading', { name: meta.label })).toBeInTheDocument();
    expect(container.querySelectorAll('.ant-form-item')).toHaveLength(
      Object.keys(meta.props).length,
    );
    for (const def of Object.values(meta.props)) {
      expect(screen.getByText(def.label, { selector: 'label' })).toBeInTheDocument();
    }
  });

  it('exports to JSX', () => {
    const placed = placeSubject(meta);
    const jsx = nodeToJsx(placed);
    expect(jsx).toContain(`<${meta.name}`);
    expect(findNode(placed, SUBJECT)?.component).toBe(meta.name);
  });

  it('starts with children it accepts', () => {
    const placed = findNode(placeSubject(meta), SUBJECT)!;
    for (const child of placed.children) {
      expect(canContain(meta.name, child.component), child.component).toBe(true);
    }
    expect(placed.children.length).toBeLessThanOrEqual(meta.maxChildren ?? Infinity);
  });
});
