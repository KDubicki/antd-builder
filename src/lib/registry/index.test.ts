import * as antd from 'antd';
import { describe, expect, it } from 'vitest';
import {
  canContain,
  codePropValues,
  components,
  createNode,
  createPlaceableNode,
  getComponentMeta,
  hasRoomFor,
} from '.';

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

  it('only starts components with children they accept', () => {
    for (const meta of components) {
      for (const child of meta.defaultChildren ?? []) {
        expect(canContain(meta.name, child), `${meta.name} -> ${child}`).toBe(true);
      }
      if (meta.defaultChildren?.length) expect(meta.children).not.toBe('none');
    }
  });

  it('uses unique prop labels within a component', () => {
    for (const meta of components) {
      const labels = Object.values(meta.props).map((def) => def.label);
      expect(new Set(labels).size, meta.name).toBe(labels.length);
    }
  });

  it('keeps JSON defaults serializable', () => {
    for (const meta of components) {
      expect(JSON.parse(JSON.stringify(meta.defaultProps)), meta.name).toEqual(meta.defaultProps);
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

  it('deep-copies default props', () => {
    const menu = getComponentMeta('Menu')!;
    const node = createNode('Menu');
    expect(node.props.items).toEqual(menu.defaultProps.items);
    expect(node.props.items).not.toBe(menu.defaultProps.items);
  });

  it('creates default children with their own ids', () => {
    const splitter = createNode('Splitter');
    expect(splitter.children.map((c) => c.component)).toEqual(['Splitter.Panel', 'Splitter.Panel']);
    expect(splitter.children[0]?.id).not.toBe(splitter.children[1]?.id);
  });

  it('generates an id when none is given', () => {
    expect(createNode('Card').id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('throws for unknown components', () => {
    expect(() => createNode('Nope')).toThrow('Unknown component: Nope');
  });
});

describe('createPlaceableNode', () => {
  it('returns free-standing components as they are', () => {
    expect(createPlaceableNode('Button', 'b')).toMatchObject({ id: 'b', component: 'Button' });
  });

  it('wraps components in the parents they require', () => {
    const row = createPlaceableNode('Col', 'c');
    expect(row.component).toBe('Row');
    expect(row.children.map((c) => c.id)).toEqual(['c']);
    expect(createPlaceableNode('Layout.Sider', 's').component).toBe('Layout');
  });
});

describe('hasRoomFor', () => {
  const dropdown = (children: string[]) => ({
    ...createNode('Dropdown', 'dd'),
    children: children.map((id) => createNode('Button', id)),
  });

  it('is unlimited without maxChildren', () => {
    expect(
      hasRoomFor({ ...createNode('Card'), children: [createNode('Tag'), createNode('Tag')] }),
    ).toBe(true);
  });

  it('enforces maxChildren, not counting a child being moved', () => {
    expect(hasRoomFor(dropdown([]))).toBe(true);
    expect(hasRoomFor(dropdown(['a']))).toBe(false);
    expect(hasRoomFor(dropdown(['a']), 'a')).toBe(true);
  });
});

describe('codePropValues', () => {
  it('maps code props to their runtime values', () => {
    const values = codePropValues(getComponentMeta('Transfer')!);
    expect(Object.keys(values)).toEqual(['render']);
    expect((values.render as (item: { title: string }) => string)({ title: 'A' })).toBe('A');
    expect(codePropValues(getComponentMeta('Button')!)).toEqual({});
  });

  it('keeps code props out of the editable props', () => {
    for (const meta of components) {
      for (const key of Object.keys(meta.codeProps ?? {})) {
        expect(meta.props, `${meta.name}.${key}`).not.toHaveProperty(key);
        expect(meta.defaultProps, `${meta.name}.${key}`).not.toHaveProperty(key);
      }
    }
  });
});

/** antd exports that aren't page components, with the reason. */
const notInPalette: Readonly<Record<string, string>> = {
  App: 'context provider for message/modal/notification hooks',
  ConfigProvider: 'theme provider; the project theme and export already use it',
  Grid: 'namespace for the useBreakpoint hook; Row and Col are the grid',
  BackTop: 'deprecated; FloatButton.BackTop replaces it',
  List: 'deprecated since 6.6; Listy replaces it',
};

describe('antd coverage', () => {
  // A new antd component fails this until it is added to the registry or listed above.
  it('offers every antd component export', () => {
    const exported = Object.keys(antd).filter((name) => /^[A-Z]/.test(name));
    const offered = new Set(components.map((meta) => meta.name.split('.')[0]));
    const missing = exported.filter((name) => !offered.has(name) && !(name in notInPalette));
    expect(missing).toEqual([]);
  });

  it('only excludes names antd still exports', () => {
    for (const name of Object.keys(notInPalette)) expect(antd, name).toHaveProperty(name);
  });
});
