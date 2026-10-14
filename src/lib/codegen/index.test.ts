import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { blocks } from '@/lib/blocks';
import { ROOT_ID, createRoot, useEditorStore } from '@/lib/editor/store';
import { components, createNode, createPlaceableNode } from '@/lib/registry';
import type { BuilderNode, DataSource } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import { boundSourceIds, collectImports, generatePage, nodeToJsx, pageComponentName } from '.';

const tree: BuilderNode = {
  id: 'root',
  component: 'Form',
  props: { layout: 'vertical' },
  children: [
    {
      id: 'field',
      component: 'Form.Item',
      props: { label: 'Name', required: true },
      children: [{ id: 'input', component: 'Input', props: {}, children: [] }],
    },
  ],
};

/**
 * Type-checks generated TSX against the installed antd and React types. The file is virtual but
 * lives inside the project, so `antd` resolves from node_modules.
 */
function typeErrors(source: string): string[] {
  const fileName = path.join(process.cwd(), '__generated__', 'Page.tsx');
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2023,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version, ...rest) =>
    name === fileName
      ? ts.createSourceFile(name, source, version, true, ts.ScriptKind.TSX)
      : getSourceFile(name, version, ...rest);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === fileName || fileExists(name);

  const program = ts.createProgram([fileName], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('nodeToJsx', () => {
  it('renders nested nodes with string and boolean props', () => {
    expect(nodeToJsx(tree)).toBe(
      [
        '<Form layout="vertical">',
        '  <Form.Item label="Name" required>',
        '    <Input />',
        '  </Form.Item>',
        '</Form>',
      ].join('\n'),
    );
  });

  it('renders text children as element content', () => {
    const button = { ...createNode('Button', 'b'), props: { children: 'Save', type: 'primary' } };
    expect(nodeToJsx(button)).toBe('<Button type="primary">Save</Button>');
  });

  it('escapes text and attributes that JSX would misread', () => {
    const node: BuilderNode = {
      id: 't',
      component: 'Typography.Text',
      props: {
        children: 'a {b} <c>',
        title: 'say "hi" & bye',
        span: 3,
        danger: false,
        x: undefined,
      },
      children: [],
    };
    expect(nodeToJsx(node)).toBe(
      '<Typography.Text title={"say \\"hi\\" & bye"} span={3} danger={false}>{"a {b} <c>"}</Typography.Text>',
    );
    expect(nodeToJsx({ ...node, props: { children: ' padded' } })).toBe(
      '<Typography.Text>{" padded"}</Typography.Text>',
    );
  });

  it('prefers child nodes over a children prop', () => {
    const card = {
      ...createNode('Card', 'c'),
      props: { children: 'ignored' },
      children: [createNode('Tag', 't')],
    };
    expect(nodeToJsx(card)).toBe('<Card>\n  <Tag>Tag</Tag>\n</Card>');
  });
});

describe('collectImports', () => {
  it('gives empty components that require children an explicit null child', () => {
    const group = { ...createNode('FloatButton.Group', 'g'), children: [] };
    expect(nodeToJsx(group)).toBe('<FloatButton.Group>{null}</FloatButton.Group>');
    expect(nodeToJsx({ ...createNode('Card', 'c'), props: {} })).toBe('<Card />');
  });

  it('writes code props as source', () => {
    const upload = { ...createNode('Upload', 'u'), children: [] };
    expect(nodeToJsx(upload)).toBe('<Upload beforeUpload={() => false} />');
  });

  it('writes structured props as JSON expressions', () => {
    const crumbs = { ...createNode('Breadcrumb', 'b'), props: { items: [{ title: 'Home' }] } };
    expect(nodeToJsx(crumbs)).toBe('<Breadcrumb items={[{"title":"Home"}]} />');
  });

  it('collects top-level antd component names', () => {
    expect([...collectImports(tree)].sort()).toEqual(['Form', 'Input']);
  });
});

describe('pageComponentName', () => {
  it('derives a PascalCase component name', () => {
    expect(pageComponentName('my shop 2')).toBe('MyShop2Page');
    expect(pageComponentName('Untitled project')).toBe('UntitledProjectPage');
    expect(pageComponentName('2024 report')).toBe('ReportPage');
    expect(pageComponentName('!!!')).toBe('Page');
    expect(pageComponentName('landing page')).toBe('LandingPage');
  });
});

describe('generatePage', () => {
  const root: BuilderNode = {
    ...createRoot(),
    children: [{ ...createNode('Card', 'card'), children: [createNode('Button', 'btn')] }],
  };

  it('generates a page without theme wrapper for the default theme', () => {
    expect(generatePage({ name: 'Shop', root, theme: createTheme() })).toBe(
      [
        "'use client';",
        '',
        "import { Button, Card, Flex } from 'antd';",
        '',
        'export default function ShopPage() {',
        '  return (',
        '    <Flex vertical gap="middle">',
        '      <Card title="Card title">',
        '        <Button type="primary">Button</Button>',
        '      </Card>',
        '    </Flex>',
        '  );',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('wraps the page in a ConfigProvider with the project theme', () => {
    const source = generatePage({
      name: 'Shop',
      root,
      theme: { mode: 'dark', compact: true, token: { colorPrimary: '#722ed1', borderRadius: 4 } },
    });
    expect(source).toContain("import { Button, Card, ConfigProvider, Flex, theme } from 'antd';");
    expect(source).toContain(
      [
        'const themeConfig: ThemeConfig = {',
        '  algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],',
        '  token: {',
        '    colorPrimary: "#722ed1",',
        '    borderRadius: 4,',
        '  },',
        '};',
      ].join('\n'),
    );
    expect(source).toContain('    <ConfigProvider theme={themeConfig}>\n      <Flex vertical');
  });

  it('omits the theme import when only tokens are customized', () => {
    const source = generatePage({
      name: 'Shop',
      root,
      theme: { ...createTheme(), token: { fontSize: 16 } },
    });
    expect(source).toContain("import { Button, Card, ConfigProvider, Flex } from 'antd';");
    expect(source).not.toContain('algorithm');
  });

  it('refuses to export components it does not know', () => {
    const bad = {
      ...createRoot(),
      children: [{ id: 'm', component: 'Marquee', props: {}, children: [] }],
    };
    expect(() => generatePage({ name: 'x', root: bad, theme: createTheme() })).toThrow(
      'Cannot export unknown components: Marquee',
    );
  });

  it('produces code that type-checks against antd for every registry component', () => {
    const everything: BuilderNode = {
      ...createRoot(),
      children: components.map((meta) => createPlaceableNode(meta.name)),
    };
    const source = generatePage({
      name: 'Everything',
      root: everything,
      theme: { mode: 'dark', compact: true, token: { colorPrimary: '#722ed1' } },
    });
    expect(typeErrors(source)).toEqual([]);
  }, 30_000);

  it('detects type errors in generated code (sanity check of the checker)', () => {
    expect(
      typeErrors("import { Button } from 'antd';\nexport const x = <Button nope />;\n"),
    ).not.toEqual([]);
  }, 30_000);
});

describe('mock data bindings', () => {
  const mockData: DataSource[] = [
    {
      id: 'u',
      name: 'users',
      data: [
        { key: '1', name: 'Ann', age: 31 },
        { key: '2', name: 'Bob', age: 45 },
      ],
    },
    { id: 's', name: 'stats', data: { 'active users': 1200, label: 'Active' } },
    { id: 'o', name: 'fruits', data: [{ label: 'Apple', value: 'apple' }] },
    { id: 'x', name: 'unused', data: [] },
  ];
  const node = (component: string, props: Record<string, unknown>, id = component) => ({
    ...createNode(component, id),
    props,
  });
  const page: BuilderNode = {
    ...createRoot(),
    children: [
      node('Typography.Text', { children: { $data: 'u', path: '0.name' }, strong: true }),
      node('Typography.Title', { children: { $data: 'u', path: 'length' } }, 'count'),
      node('Statistic', {
        title: { $data: 's', path: 'label' },
        value: { $data: 's', path: 'active users' },
      }),
      node('Table', {
        columns: [{ title: 'Name', dataIndex: 'name', key: 'name' }],
        dataSource: { $data: 'u' },
      }),
      node('Select', { options: { $data: 'o' }, placeholder: { $data: 'gone' } }),
    ],
  };

  it('writes bound props as expressions into the mock data', () => {
    const jsx = nodeToJsx(page, 0, mockData);
    expect(jsx).toContain('<Typography.Text strong>{users[0]?.name}</Typography.Text>');
    expect(jsx).toContain('<Typography.Title>{String(users.length)}</Typography.Title>');
    expect(jsx).toContain('<Statistic title={stats.label} value={stats["active users"]} />');
    expect(jsx).toContain('dataSource={users} />');
    // Bindings that don't resolve are left out, as on the canvas.
    expect(jsx).toContain('<Select options={fruits} />');
  });

  it('declares only the data sources the page uses', () => {
    expect([...boundSourceIds(page)].sort()).toEqual(['gone', 'o', 's', 'u']);
    const source = generatePage({ name: 'Users', root: page, theme: createTheme(), mockData });
    expect(source).toContain('// Mock API responses: replace with real data fetching.');
    expect(source).toContain('const users = [\n  {\n    "key": "1",');
    expect(source).toContain('const stats = {');
    expect(source).toContain('const fruits = [');
    expect(source).not.toContain('const unused');
    expect(source.indexOf('const users')).toBeLessThan(source.indexOf('export default'));
    expect(
      generatePage({ name: 'Plain', root: createRoot(), theme: createTheme(), mockData }),
    ).not.toContain('Mock API');
  });

  it('produces code that type-checks against antd', () => {
    const source = generatePage({
      name: 'Users',
      root: page,
      theme: { mode: 'dark', compact: false, token: {} },
      mockData,
    });
    expect(typeErrors(source)).toEqual([]);
  }, 30_000);
});

describe('blocks', () => {
  it('export code that type-checks against antd', () => {
    useEditorStore.setState({ root: createRoot(), mockData: [], past: [], future: [] });
    for (const block of blocks) {
      useEditorStore.getState().insertBlock(block.id, { parentId: ROOT_ID, index: 0 });
    }
    const source = generatePage({ ...useEditorStore.getState(), name: 'Blocks' });
    expect(source).toContain('const stats = {');
    expect(source).toContain('const users = [');
    expect(typeErrors(source)).toEqual([]);
  }, 30_000);
});
