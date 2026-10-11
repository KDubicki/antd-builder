import { describe, expect, it } from 'vitest';
import type { BuilderNode } from '@/lib/schema';
import { planDrop } from './drop';

const root: BuilderNode = {
  id: 'root',
  component: 'Flex',
  props: {},
  children: [{ id: 'card', component: 'Card', props: {}, children: [] }],
};

describe('planDrop', () => {
  it('adds palette components at the resolved target', () => {
    expect(planDrop(root, { type: 'palette', component: 'Button' }, ['card', 'root'])).toEqual({
      type: 'add',
      component: 'Button',
      target: { parentId: 'card', index: 0 },
    });
  });

  it('drops on empty canvas space into the root', () => {
    expect(planDrop(root, { type: 'palette', component: 'Tag' }, [])).toEqual({
      type: 'add',
      component: 'Tag',
      target: { parentId: 'root', index: 1 },
    });
  });

  it('moves existing nodes, never into themselves', () => {
    expect(
      planDrop(root, { type: 'node', nodeId: 'card', component: 'Card' }, ['card', 'root']),
    ).toEqual({ type: 'move', nodeId: 'card', target: { parentId: 'root', index: 1 } });
  });

  it('returns null when nothing accepts the component', () => {
    expect(planDrop(root, { type: 'palette', component: 'Col' }, [])).toBeNull();
    expect(planDrop(root, { type: 'node', nodeId: 'x', component: 'Col' }, [])).toBeNull();
  });
});
