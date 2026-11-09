import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { isBinding, resolveBinding } from '@/lib/mockData';
import { parseProject, toProject } from '@/lib/project';
import { getComponentMeta } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { createTheme, themePresets } from '@/lib/theme';
import { ROOT_ID, createRoot } from '@/lib/tree';
import {
  type PageTemplate,
  findTemplates,
  getTemplate,
  instantiateTemplate,
  templateCategoryLabels,
  templates,
  usedCategories,
} from '.';

const state = () => useEditorStore.getState();
const allNodes = (node: BuilderNode): BuilderNode[] => [node, ...node.children.flatMap(allNodes)];

beforeEach(() =>
  useEditorStore.setState({
    name: 'Mine',
    root: createRoot(),
    theme: createTheme(),
    mockData: [],
    customBlocks: [],
    versions: [],
    selectedId: null,
    past: [],
    future: [],
    lastEdit: null,
  }),
);

describe.each(templates.map((template) => [template.id, template] as const))(
  'template %s',
  (_id, template) => {
    it('is listed under a known category and found by id', () => {
      expect(templateCategoryLabels[template.category]).toBeTruthy();
      expect(getTemplate(template.id)).toBe(template);
      if (template.preset) {
        expect(themePresets.map((preset) => preset.id)).toContain(template.preset);
      }
    });

    it('builds a valid project whose bindings all resolve', () => {
      const content = instantiateTemplate(template);
      expect(content.root.id).toBe(ROOT_ID);
      expect(content.root.children.length).toBeGreaterThan(0);
      const result = parseProject(JSON.stringify(toProject(content)));
      expect(result.ok ? null : result.error).toBeNull();

      for (const node of allNodes(content.root)) {
        const meta = getComponentMeta(node.component)!;
        for (const [key, value] of Object.entries(node.props)) {
          const def = meta.props[key];
          expect(def, `${node.component}.${key} is an inspector prop`).toBeDefined();
          if (!isBinding(value)) continue;
          expect(
            resolveBinding(value, def, content.mockData),
            `${node.component}.${key}`,
          ).toMatchObject({ ok: true });
        }
      }
    });

    it('uses every data source it declares, under a unique name', () => {
      const content = instantiateTemplate(template);
      const names = content.mockData.map((source) => source.name);
      expect(new Set(names).size).toBe(names.length);
      const bound = new Set(
        allNodes(content.root).flatMap((node) =>
          Object.values(node.props).flatMap((value) => (isBinding(value) ? [value.$data] : [])),
        ),
      );
      expect(content.mockData.filter((source) => !bound.has(source.id))).toEqual([]);
    });

    it('gives each copy fresh ids and its own data', () => {
      const ids = (root: BuilderNode) =>
        allNodes(root).flatMap((n) => (n.id === ROOT_ID ? [] : n.id));
      const first = instantiateTemplate(template);
      const second = instantiateTemplate(template);
      expect(ids(second.root).some((id) => ids(first.root).includes(id))).toBe(false);
      expect(new Set(ids(first.root)).size).toBe(ids(first.root).length);
      if (first.mockData[0]) {
        expect(second.mockData[0]!.id).not.toBe(first.mockData[0].id);
        expect(second.mockData[0]!.data).not.toBe(first.mockData[0].data);
      }
    });
  },
);

describe('instantiateTemplate', () => {
  const custom = (overrides: Partial<PageTemplate>): PageTemplate => ({
    id: 'custom',
    label: 'Custom',
    description: '',
    category: 'app',
    build: () => [],
    ...overrides,
  });

  it('names the project after the template and applies its preset', () => {
    const content = instantiateTemplate(custom({ preset: 'midnight' }));
    expect(content.name).toBe('Custom');
    expect(content.theme.mode).toBe('dark');
    content.theme.token.colorPrimary = '#000';
    expect(themePresets.find((p) => p.id === 'midnight')!.theme.token.colorPrimary).not.toBe(
      '#000',
    );
  });

  it('falls back to the default theme', () => {
    expect(instantiateTemplate(custom({ preset: 'nope' })).theme).toEqual(createTheme());
  });

  it('refuses to bind a data source the template does not declare', () => {
    const broken = custom({ build: (source) => [{ ...createRoot(), id: source('missing') }] });
    expect(() => instantiateTemplate(broken)).toThrow('no data source "missing"');
  });
});

describe('loadTemplate', () => {
  it('starts a project from the template, keeping saved blocks', () => {
    state().addNode('Button', { parentId: ROOT_ID, index: 0 });
    const block = state().saveAsBlock(state().root.children[0]!.id, 'Mine')!;
    state().saveVersion('Before');

    expect(state().loadTemplate('dashboard')).toBe(true);
    expect(state().name).toBe('Admin dashboard');
    expect(state().mockData.map((source) => source.name)).toEqual(['stats', 'orders']);
    expect(state().customBlocks.map((b) => b.id)).toEqual([block]);
    expect(state().versions).toEqual([]);
    expect(state().past).toEqual([]);
    expect(state().selectedId).toBeNull();
  });

  it('ignores unknown templates', () => {
    expect(state().loadTemplate('nope')).toBe(false);
    expect(state().name).toBe('Mine');
  });
});

describe('findTemplates', () => {
  const ids = (list: readonly PageTemplate[]) => list.map((template) => template.id);

  it('lists everything for an empty search', () => {
    expect(findTemplates('')).toEqual(templates);
  });

  it('searches names, descriptions, categories and data names', () => {
    expect(ids(findTemplates('404'))).toEqual(['not-found']);
    expect(ids(findTemplates('size picker'))).toEqual(['product']);
    expect(ids(findTemplates('marketing'))).toEqual(['landing']);
    expect(ids(findTemplates('customers'))).toEqual(['crud-list']);
    expect(findTemplates('nothing like this')).toEqual([]);
  });

  it('filters by category', () => {
    expect(ids(findTemplates('', 'account'))).toEqual(['sign-in', 'sign-up', 'settings']);
    expect(ids(findTemplates('sign', 'account'))).toEqual(['sign-in', 'sign-up']);
  });

  it('lists the categories in use, in gallery order', () => {
    expect(usedCategories()).toEqual(['app', 'marketing', 'account', 'content', 'status']);
    expect(usedCategories([templates.at(-1)!])).toEqual(['status']);
  });
});
