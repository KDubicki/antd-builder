import { describe, expect, it } from 'vitest';
import type { BuilderNode } from '@/lib/schema';
import {
  cloneNode,
  duplicateNode,
  findNode,
  findParent,
  insertNode,
  isWithin,
  moveNode,
  removeNode,
  resolveDrop,
  updateNodeProps,
} from '.';

const node = (id: string, component: string, children: BuilderNode[] = []): BuilderNode => ({
  id,
  component,
  props: {},
  children,
});

// root(Flex) > [card(Card) > [btn(Button)], row(Row) > [col(Col)], tag(Tag)]
const tree = node('root', 'Flex', [
  node('card', 'Card', [node('btn', 'Button')]),
  node('row', 'Row', [node('col', 'Col')]),
  node('tag', 'Tag'),
]);

const ids = (n: BuilderNode): string[] => n.children.map((c) => c.id);

describe('lookup', () => {
  it('finds nodes and parents', () => {
    expect(findNode(tree, 'btn')?.component).toBe('Button');
    expect(findNode(tree, 'nope')).toBeUndefined();
    expect(findParent(tree, 'btn')?.id).toBe('card');
    expect(findParent(tree, 'root')).toBeUndefined();
  });

  it('checks subtree membership', () => {
    expect(isWithin(tree, 'card', 'btn')).toBe(true);
    expect(isWithin(tree, 'card', 'card')).toBe(true);
    expect(isWithin(tree, 'card', 'col')).toBe(false);
    expect(isWithin(tree, 'nope', 'btn')).toBe(false);
  });
});

describe('insertNode', () => {
  it('inserts at the index without mutating the original', () => {
    const next = insertNode(tree, node('x', 'Tag'), { parentId: 'root', index: 1 });
    expect(ids(next)).toEqual(['card', 'x', 'row', 'tag']);
    expect(ids(tree)).toEqual(['card', 'row', 'tag']);
  });

  it('clamps the index and keeps untouched subtrees shared', () => {
    const next = insertNode(tree, node('x', 'Tag'), { parentId: 'card', index: 99 });
    expect(ids(findNode(next, 'card')!)).toEqual(['btn', 'x']);
    expect(findNode(next, 'row')).toBe(findNode(tree, 'row'));
  });
});

describe('removeNode', () => {
  it('removes a nested node', () => {
    expect(ids(findNode(removeNode(tree, 'btn'), 'card')!)).toEqual([]);
  });

  it('ignores the root and unknown ids', () => {
    expect(removeNode(tree, 'root')).toBe(tree);
    expect(removeNode(tree, 'nope')).toBe(tree);
  });
});

describe('updateNodeProps', () => {
  it('merges props and removes undefined ones', () => {
    const base = insertNode(
      tree,
      { ...node('x', 'Tag'), props: { color: 'red', children: 'Hi' } },
      {
        parentId: 'root',
        index: 0,
      },
    );
    const next = updateNodeProps(base, 'x', { children: 'Bye', color: undefined, bordered: true });
    expect(findNode(next, 'x')?.props).toEqual({ children: 'Bye', bordered: true });
    expect(findNode(base, 'x')?.props).toEqual({ color: 'red', children: 'Hi' });
  });

  it('ignores unknown ids', () => {
    expect(updateNodeProps(tree, 'nope', { a: 1 })).toBe(tree);
  });
});

describe('cloneNode', () => {
  it('deep-copies a subtree with fresh ids', () => {
    let n = 0;
    const source: BuilderNode = {
      ...node('card', 'Card', [node('btn', 'Button')]),
      props: { title: 'Hi', style: { padding: 8 } },
    };
    const copy = cloneNode(source, () => `new-${++n}`);
    expect(copy).toEqual({
      id: 'new-1',
      component: 'Card',
      props: { title: 'Hi', style: { padding: 8 } },
      children: [{ id: 'new-2', component: 'Button', props: {}, children: [] }],
    });
    expect(copy.props.style).not.toBe(source.props.style);
  });

  it('uses random UUIDs by default', () => {
    const copy = cloneNode(node('tag', 'Tag'));
    expect(copy.id).not.toBe('tag');
    expect(copy.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('duplicateNode', () => {
  it('inserts the copy right after the original', () => {
    let n = 0;
    const result = duplicateNode(tree, 'card', () => `copy-${++n}`);
    expect(result?.id).toBe('copy-1');
    expect(ids(result!.root)).toEqual(['card', 'copy-1', 'row', 'tag']);
    expect(ids(findNode(result!.root, 'copy-1')!)).toEqual(['copy-2']);
    expect(tree.children).toHaveLength(3);
  });

  it('duplicates nested nodes inside their parent', () => {
    const result = duplicateNode(tree, 'col', () => 'col-2');
    expect(ids(findNode(result!.root, 'row')!)).toEqual(['col', 'col-2']);
  });

  it('returns null for the root or a missing node', () => {
    expect(duplicateNode(tree, 'root')).toBeNull();
    expect(duplicateNode(tree, 'nope')).toBeNull();
  });
});

describe('moveNode', () => {
  it('moves a node into another parent', () => {
    const next = moveNode(tree, 'tag', { parentId: 'card', index: 0 });
    expect(ids(findNode(next, 'card')!)).toEqual(['tag', 'btn']);
    expect(ids(next)).toEqual(['card', 'row']);
  });

  it('accounts for the removed slot when moving forward within a parent', () => {
    expect(ids(moveNode(tree, 'card', { parentId: 'root', index: 3 }))).toEqual([
      'row',
      'tag',
      'card',
    ]);
    expect(ids(moveNode(tree, 'tag', { parentId: 'root', index: 0 }))).toEqual([
      'tag',
      'card',
      'row',
    ]);
  });

  it('refuses to move a node into itself or its descendants', () => {
    expect(moveNode(tree, 'card', { parentId: 'btn', index: 0 })).toBe(tree);
    expect(moveNode(tree, 'card', { parentId: 'card', index: 0 })).toBe(tree);
  });

  it('ignores the root and unknown ids', () => {
    expect(moveNode(tree, 'root', { parentId: 'card', index: 0 })).toBe(tree);
    expect(moveNode(tree, 'nope', { parentId: 'card', index: 0 })).toBe(tree);
  });
});

describe('resolveDrop', () => {
  it('appends to the innermost accepting container', () => {
    expect(resolveDrop(tree, ['card', 'root'], 'Tag')).toEqual({ parentId: 'card', index: 1 });
  });

  it('inserts after a leaf when its parent accepts the component', () => {
    expect(resolveDrop(tree, ['btn', 'card', 'root'], 'Tag')).toEqual({
      parentId: 'card',
      index: 1,
    });
    expect(resolveDrop(tree, ['tag', 'root'], 'Card')).toEqual({ parentId: 'root', index: 3 });
  });

  it('respects nesting rules, falling back to outer containers', () => {
    // A Row only takes Cols, so a Button dropped on it lands after it in the root.
    expect(resolveDrop(tree, ['row', 'root'], 'Button')).toEqual({ parentId: 'root', index: 2 });
    expect(resolveDrop(tree, ['row', 'root'], 'Col')).toEqual({ parentId: 'row', index: 1 });
    expect(resolveDrop(tree, ['card', 'root'], 'Col')).toBeNull();
  });

  it('skips the moving node and its descendants', () => {
    expect(resolveDrop(tree, ['btn', 'card', 'root'], 'Card', 'card')).toEqual({
      parentId: 'root',
      index: 3,
    });
  });

  it('ignores ids that are not in the tree', () => {
    expect(resolveDrop(tree, ['ghost', 'root'], 'Tag')).toEqual({ parentId: 'root', index: 3 });
    expect(resolveDrop(tree, [], 'Tag')).toBeNull();
  });
});
