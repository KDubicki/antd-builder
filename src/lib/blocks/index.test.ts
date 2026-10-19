import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { isBinding, resolveBinding } from '@/lib/mockData';
import { toProject, parseProject } from '@/lib/project';
import { getComponentMeta } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import { createRoot, findNode, ROOT_ID } from '@/lib/tree';
import { blocks, getBlock } from '.';

const state = () => useEditorStore.getState();
const top = { parentId: ROOT_ID, index: 0 };

const allNodes = (node: BuilderNode): BuilderNode[] => [node, ...node.children.flatMap(allNodes)];

beforeEach(() =>
  useEditorStore.setState({
    root: createRoot(),
    theme: createTheme(),
    mockData: [],
    selectedId: null,
    past: [],
    future: [],
    lastEdit: null,
  }),
);

describe.each(blocks.map((block) => [block.id, block] as const))('block %s', (_id, block) => {
  it('declares its root component', () => {
    expect(block.build('x').component).toBe(block.component);
    expect(getBlock(block.id)).toBe(block);
  });

  it('builds a fresh tree each time', () => {
    const ids = (node: BuilderNode) => allNodes(node).map((n) => n.id);
    const first = ids(block.build('x'));
    expect(new Set(first).size).toBe(first.length);
    expect(ids(block.build('x')).some((id) => first.includes(id))).toBe(false);
  });

  it('inserts as a valid page whose bindings all resolve', () => {
    const id = state().insertBlock(block.id, top)!;
    expect(state().selectedId).toBe(id);
    const result = parseProject(JSON.stringify(toProject(state())));
    expect(result.ok ? null : result.error).toBeNull();

    for (const node of allNodes(findNode(state().root, id)!)) {
      for (const [key, value] of Object.entries(node.props)) {
        if (!isBinding(value)) continue;
        const def = getComponentMeta(node.component)?.props[key];
        expect(
          resolveBinding(value, def, state().mockData),
          `${node.component}.${key}`,
        ).toMatchObject({
          ok: true,
        });
      }
    }
  });
});

describe('insertBlock', () => {
  it('adds the block and its data source as one undo step', () => {
    state().insertBlock('user-table', top);
    expect(state().mockData.map((s) => s.name)).toEqual(['users']);
    expect(state().root.children).toHaveLength(1);
    state().undo();
    expect(state().mockData).toEqual([]);
    expect(state().root.children).toEqual([]);
  });

  it('reuses a data source with the same name', () => {
    const users = state().addDataSource('users');
    state().updateDataSource(users, { data: [{ name: 'Mine', key: 'm' }] });
    const id = state().insertBlock('user-table', top)!;
    expect(state().mockData).toHaveLength(1);
    const table = findNode(state().root, id)!.children[0]!;
    expect(table.props.dataSource).toEqual({ $data: users });
  });

  it('gives each inserted copy its own data-free tree', () => {
    state().insertBlock('page-header', top);
    state().insertBlock('page-header', top);
    expect(state().mockData).toEqual([]);
    expect(state().root.children).toHaveLength(2);
  });

  it('ignores unknown blocks', () => {
    expect(state().insertBlock('nope', top)).toBeNull();
    expect(state().past).toHaveLength(0);
  });
});
