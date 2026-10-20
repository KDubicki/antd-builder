import { describe, expect, it } from 'vitest';
import type { BuilderNode } from '@/lib/schema';
import { ancestorIds, expandableIds, expandedIds, filterLayers, toLayerTree } from './layerTree';
import { createRoot } from '@/lib/tree';

const node = (
  id: string,
  component: string,
  props: Record<string, unknown> = {},
  children: BuilderNode[] = [],
): BuilderNode => ({ id, component, props, children });

// root > [card > [btn], row > [col], input]
const root: BuilderNode = {
  ...createRoot(),
  children: [
    node('card', 'Card', { title: 'Profile' }, [node('btn', 'Button', { children: 'Save' })]),
    node('row', 'Row', {}, [node('col', 'Col')]),
    node('input', 'Input', { placeholder: '  a   very long placeholder text here  ' }),
  ],
};

describe('toLayerTree', () => {
  it('mirrors the page tree with labels and hints', () => {
    const tree = toLayerTree(root);
    expect(tree).toMatchObject({ key: 'root', label: 'Page', hint: undefined });
    const [card, row, input] = tree.children;
    expect(card).toMatchObject({ key: 'card', label: 'Card', hint: 'Profile' });
    expect(card?.children[0]).toMatchObject({ key: 'btn', label: 'Button', hint: 'Save' });
    expect(row).toMatchObject({ label: 'Grid row', hint: undefined });
    expect(row?.children[0]).toMatchObject({ key: 'col', label: 'Grid column' });
    expect(input?.hint).toBe('a very long placeholder…');
    expect(input?.hint).toHaveLength(24);
  });

  it('omits a hint that repeats the label', () => {
    expect(toLayerTree(node('b', 'Button', { children: 'Button' })).hint).toBeUndefined();
  });

  it('falls back to the component name for unknown components', () => {
    expect(toLayerTree(node('x', 'Mystery', { children: 42 }))).toMatchObject({
      label: 'Mystery',
      hint: undefined,
    });
  });
});

describe('filterLayers', () => {
  const keys = (layer: ReturnType<typeof filterLayers>): unknown =>
    layer && [layer.key, ...layer.children.map(keys)];

  it('keeps matching layers and the layers leading to them', () => {
    const tree = toLayerTree(root);
    expect(keys(filterLayers(tree, ''))).toEqual(keys(tree));
    expect(keys(filterLayers(tree, 'save'))).toEqual(['root', ['card', ['btn']]]);
    expect(keys(filterLayers(tree, 'grid'))).toEqual(['root', ['row', ['col']]]);
    expect(keys(filterLayers(tree, 'grid column'))).toEqual(['root', ['row', ['col']]]);
    expect(keys(filterLayers(tree, 'profile'))).toEqual(['root', ['card']]);
  });

  it('is null when nothing matches', () => {
    expect(filterLayers(toLayerTree(root), 'zzz')).toBeNull();
  });
});

describe('ancestorIds', () => {
  it('returns the path down to a node', () => {
    expect(ancestorIds(root, 'btn')).toEqual(['root', 'card']);
    expect(ancestorIds(root, 'card')).toEqual(['root']);
  });

  it('is empty for the root or a missing node', () => {
    expect(ancestorIds(root, 'root')).toEqual([]);
    expect(ancestorIds(root, 'nope')).toEqual([]);
  });
});

describe('expandableIds', () => {
  it('lists nodes with children', () => {
    expect(expandableIds(root)).toEqual(['root', 'card', 'row']);
    expect(expandableIds(createRoot())).toEqual([]);
  });
});

describe('expandedIds', () => {
  it('expands everything not collapsed', () => {
    expect(expandedIds(root, null, new Set())).toEqual(['root', 'card', 'row']);
    expect(expandedIds(root, null, new Set(['card']))).toEqual(['root', 'row']);
  });

  it('keeps the ancestors of the selection expanded', () => {
    expect(expandedIds(root, 'btn', new Set(['root', 'card', 'row']))).toEqual(['root', 'card']);
  });
});
