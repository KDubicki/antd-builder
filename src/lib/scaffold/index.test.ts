// @vitest-environment node
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import type { ProjectContent } from '@/lib/project';
import { createNode } from '@/lib/registry';
import { buildScaffold } from '.';
import { createRoot } from '@/lib/tree';

const content = (overrides: Partial<ProjectContent> = {}): ProjectContent => ({
  name: 'My Shop!',
  root: {
    ...createRoot(),
    children: [
      {
        ...createNode('Table', 'table'),
        props: {
          columns: [{ title: 'Name', dataIndex: 'name', key: 'name' }],
          dataSource: { $data: 'u' },
        },
      },
      {
        ...createNode('Typography.Text', 'text'),
        props: { children: { $data: 'u', path: '0.name' } },
      },
    ],
  },
  theme: { mode: 'dark', compact: false, token: { colorPrimary: '#722ed1' } },
  mockData: [
    { id: 'u', name: 'users', data: [{ key: '1', name: 'Ann' }], url: 'https://x.dev/users' },
    { id: 'x', name: 'unused', data: [] },
  ],
  customBlocks: [],
  versions: [],
  ...overrides,
});

/**
 * Type-checks the scaffold as its own project would, resolving packages from this repo's
 * node_modules (the versions the scaffold depends on).
 */
function typeErrors(files: Record<string, string>): string[] {
  const root = path.join(process.cwd(), '__scaffold__');
  const virtual = new Map(
    Object.entries(files).map(([name, text]) => [path.join(root, name), text]),
  );
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ES2023,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
    types: ['node'],
    paths: { '@/*': [path.join(root, '*')] },
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version, ...rest) => {
    const text = virtual.get(name);
    return text === undefined
      ? getSourceFile(name, version, ...rest)
      : ts.createSourceFile(name, text, version, true);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => virtual.has(name) || fileExists(name);
  const directoryExists = host.directoryExists?.bind(host);
  host.directoryExists = (name) =>
    [...virtual.keys()].some((file) => file.startsWith(`${name}${path.sep}`)) ||
    (directoryExists?.(name) ?? false);
  const readFile = host.readFile.bind(host);
  host.readFile = (name) => virtual.get(name) ?? readFile(name);

  const entries = [...virtual.keys()].filter((name) => /\.tsx?$/.test(name));
  const program = ts.createProgram(entries, options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map(
      (d) => `${d.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
    );
}

describe('buildScaffold', () => {
  it('lays out a Next.js app with the page, its data and stub API routes', () => {
    const files = buildScaffold(content());
    expect(Object.keys(files).sort()).toEqual([
      '.gitignore',
      'README.md',
      'app/api/users/route.ts',
      'app/layout.tsx',
      'app/page.tsx',
      'data/users.json',
      'next.config.ts',
      'package.json',
      'tsconfig.json',
    ]);
    const pkg = JSON.parse(files['package.json']!) as { name: string; dependencies: object };
    expect(pkg.name).toBe('my-shop');
    expect(pkg.dependencies).toHaveProperty('antd');
    expect(JSON.parse(files['data/users.json']!)).toEqual([{ key: '1', name: 'Ann' }]);
    expect(files['app/page.tsx']).toContain("import users from '@/data/users.json';");
    expect(files['app/page.tsx']).not.toContain('const users');
    expect(files['app/page.tsx']).toContain('const themeConfig');
    expect(files['app/layout.tsx']).toContain('title: "My Shop!"');
    expect(files['README.md']).toContain('`data/users.json`, also served by `GET /api/users`');
  });

  it('leaves out data sections when the page uses no data', () => {
    const files = buildScaffold(content({ root: createRoot() }));
    expect(Object.keys(files).some((name) => name.startsWith('data/'))).toBe(false);
    expect(files['README.md']).not.toContain('Mock data');
  });

  // One compile (they take seconds): a planted error must be the only one reported, which shows
  // both that the checker sees the files and that everything generated is clean.
  it('produces a project that type-checks', () => {
    const files = buildScaffold(content());
    files['planted.ts'] = 'export const planted: number = "not a number";';
    const errors = typeErrors(files);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/planted\.ts: Type 'string' is not assignable to type 'number'/);
  }, 60_000);
});
