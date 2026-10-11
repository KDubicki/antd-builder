import { describe, expect, it } from 'vitest';
import { canContain, components, createNode, getComponentMeta } from '.';

describe('component registry', () => {
  it('has unique component names', () => {
    const names = components.map((meta) => meta.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only sets default props that the component declares', () => {
    for (const meta of components) {
      for (const key of Object.keys(meta.defaultProps)) {
        expect(meta.props, `${meta.name}.${key}`).toHaveProperty(key);
      }
    }
  });

  it('keeps enum defaults within their options', () => {
    for (const meta of components) {
      for (const [key, value] of Object.entries(meta.defaultProps)) {
        const def = meta.props[key];
        if (def?.type === 'enum') expect(def.options, `${meta.name}.${key}`).toContain(value);
      }
    }
  });

  it('references only registered components in children and parent rules', () => {
    for (const meta of components) {
      const refs = [
        ...(Array.isArray(meta.children) ? meta.children : []),
        ...(meta.parents ?? []),
      ];
      for (const ref of refs) expect(getComponentMeta(ref), `${meta.name} -> ${ref}`).toBeDefined();
    }
  });

  it('looks components up by name', () => {
    expect(getComponentMeta('Form.Item')?.label).toBe('Form field');
    expect(getComponentMeta('Nope')).toBeUndefined();
  });
});

describe('canContain', () => {
  it('allows any free-standing component inside an "any" container', () => {
    expect(canContain('Card', 'Button')).toBe(true);
    expect(canContain('Flex', 'Card')).toBe(true);
  });

  it('rejects children for leaf components', () => {
    expect(canContain('Button', 'Tag')).toBe(false);
  });

  it('enforces explicit children lists', () => {
    expect(canContain('Row', 'Col')).toBe(true);
    expect(canContain('Row', 'Button')).toBe(false);
  });

  it('enforces required parents', () => {
    expect(canContain('Flex', 'Col')).toBe(false);
    expect(canContain('Card', 'Form.Item')).toBe(false);
    expect(canContain('Form', 'Form.Item')).toBe(true);
  });

  it('rejects unknown components', () => {
    expect(canContain('Nope', 'Button')).toBe(false);
    expect(canContain('Card', 'Nope')).toBe(false);
  });
});

describe('createNode', () => {
  it('creates a node with a copy of the default props', () => {
    const node = createNode('Button', 'b1');
    expect(node).toEqual({
      id: 'b1',
      component: 'Button',
      props: { children: 'Button', type: 'primary' },
      children: [],
    });
    expect(node.props).not.toBe(getComponentMeta('Button')?.defaultProps);
  });

  it('generates an id when none is given', () => {
    expect(createNode('Card').id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('throws for unknown components', () => {
    expect(() => createNode('Nope')).toThrow('Unknown component: Nope');
  });
});
