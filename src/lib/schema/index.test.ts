import { describe, expect, it } from 'vitest';
import { builderNodeSchema } from '.';

describe('builderNodeSchema', () => {
  it('accepts a nested tree', () => {
    const node = {
      id: 'a',
      component: 'Card',
      props: { title: 'Hi' },
      children: [{ id: 'b', component: 'Button', props: {}, children: [] }],
    };
    expect(builderNodeSchema.parse(node)).toEqual(node);
  });

  it('rejects a node without children array', () => {
    expect(builderNodeSchema.safeParse({ id: 'a', component: 'Card', props: {} }).success).toBe(
      false,
    );
  });
});
