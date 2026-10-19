import { describe, expect, it } from 'vitest';
import { ROOT_ID, createRoot } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { createTheme } from '@/lib/theme';
import { parseProject, projectFileName, toProject } from '.';

const content = {
  name: 'Shop',
  root: {
    ...createRoot(),
    children: [{ ...createNode('Card', 'card'), children: [createNode('Button', 'btn')] }],
  },
  theme: { ...createTheme(), mode: 'dark' as const, token: { colorPrimary: '#722ed1' } },
  mockData: [{ id: 'd1', name: 'users', data: [{ name: 'Alice' }] }],
  customBlocks: [{ id: 'b1', name: 'Promo', root: createNode('Button', 'promo') }],
  versions: [
    {
      id: 'v1',
      name: 'First draft',
      createdAt: '2026-10-16T10:00:00.000Z',
      root: createRoot(),
      theme: createTheme(),
      mockData: [],
      customBlocks: [],
    },
  ],
};

const withRoot = (root: BuilderNode) =>
  JSON.stringify({ ...toProject(content), pages: [{ id: 'home', name: 'Home', root }] });

describe('project files', () => {
  it('round-trips through JSON', () => {
    expect(parseProject(JSON.stringify(toProject(content)))).toEqual({ ok: true, content });
  });

  it('builds a versioned single-page project', () => {
    expect(toProject(content)).toMatchObject({
      version: 1,
      name: 'Shop',
      pages: [{ id: 'home', name: 'Home', root: content.root }],
      customComponents: [],
    });
  });

  it('normalizes the page root id', () => {
    const result = parseProject(withRoot({ ...content.root, id: 'page-root' }));
    expect(result.ok && result.content.root.id).toBe(ROOT_ID);
  });

  it('rejects invalid JSON', () => {
    expect(parseProject('{')).toEqual({ ok: false, error: 'The file is not valid JSON.' });
  });

  it('rejects documents that do not match the schema', () => {
    const result = parseProject(JSON.stringify({ ...toProject(content), version: 2 }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/^Invalid project file: version:/);
  });

  it('rejects projects without pages', () => {
    expect(parseProject(JSON.stringify({ ...toProject(content), pages: [] }))).toEqual({
      ok: false,
      error: 'The project has no pages.',
    });
  });

  it('rejects unknown components, broken nesting and duplicate ids', () => {
    const root: BuilderNode = {
      ...createRoot(),
      children: [
        { id: 'x', component: 'Marquee', props: {}, children: [] },
        createNode('Col', 'col'),
        createNode('Tag', 'col'),
        createNode('Tag', ROOT_ID),
        { ...createNode('Tooltip', 'tip'), children: [createNode('Tag'), createNode('Tag')] },
      ],
    };
    const result = parseProject(withRoot(root));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe(
      'Invalid page tree: Unknown component "Marquee"; "Col" can\'t be placed inside "Flex"; ' +
        `Duplicate node id "col"; Duplicate node id "${ROOT_ID}"; "Tooltip" holds at most 1 child`,
    );
  });
});

describe('project mock data', () => {
  const withMockData = (mockData: unknown) => JSON.stringify({ ...toProject(content), mockData });

  it('opens files saved before mock data existed', () => {
    const legacy: Partial<ReturnType<typeof toProject>> = toProject(content);
    delete legacy.mockData;
    const result = parseProject(JSON.stringify(legacy));
    expect(result.ok && result.content.mockData).toEqual([]);
  });

  it('rejects invalid or duplicate names and duplicate ids', () => {
    const bad = parseProject(
      withMockData([
        { id: 'a', name: 'Users', data: 1 },
        { id: 'b', name: 'ok', data: 1 },
        { id: 'b', name: 'ok', data: 2 },
      ]),
    );
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error).toMatch(/^Invalid mock data: /);
    expect(!bad.ok && bad.error).toContain('"Users"');
    expect(!bad.ok && bad.error).toContain('"ok" is already used');
    expect(!bad.ok && bad.error).toContain('Duplicate data source id "b"');
  });

  it('rejects data that is not JSON', () => {
    expect(parseProject(withMockData([{ id: 'a', name: 'a' }])).ok).toBe(false);
  });
});

describe('project custom blocks', () => {
  it('opens files saved before custom blocks existed', () => {
    const legacy: Partial<ReturnType<typeof toProject>> = toProject(content);
    delete legacy.customBlocks;
    const result = parseProject(JSON.stringify(legacy));
    expect(result.ok && result.content.customBlocks).toEqual([]);
  });

  it('rejects blocks with unknown components or broken nesting', () => {
    const block = (root: BuilderNode) =>
      parseProject(
        JSON.stringify({ ...toProject(content), customBlocks: [{ id: 'b', name: 'Bad', root }] }),
      );
    const unknown = block({ id: 'x', component: 'Marquee', props: {}, children: [] });
    expect(!unknown.ok && unknown.error).toBe('Invalid block "Bad": Unknown component "Marquee"');
    const nested = block({ ...createNode('Row', 'r'), children: [createNode('Tag', 't')] });
    expect(!nested.ok && nested.error).toContain(`"Tag" can't be placed inside "Row"`);
  });
});

describe('project versions', () => {
  it('opens files saved before versions existed', () => {
    const legacy: Partial<ReturnType<typeof toProject>> = toProject(content);
    delete legacy.versions;
    const result = parseProject(JSON.stringify(legacy));
    expect(result.ok && result.content.versions).toEqual([]);
  });

  it('normalizes version root ids and rejects broken versions', () => {
    const version = { ...content.versions[0]!, root: { ...createRoot(), id: 'other' } };
    const ok = parseProject(JSON.stringify({ ...toProject(content), versions: [version] }));
    expect(ok.ok && ok.content.versions[0]?.root.id).toBe(ROOT_ID);

    const broken = {
      ...version,
      mockData: [{ id: 'd', name: 'Bad Name', data: 1 }],
    };
    const result = parseProject(JSON.stringify({ ...toProject(content), versions: [broken] }));
    expect(!result.ok && result.error).toMatch(/^Invalid version "First draft": Data source/);
  });
});

describe('projectFileName', () => {
  it('slugifies the project name', () => {
    expect(projectFileName('My Shop — v2!')).toBe('my-shop-v2.json');
    expect(projectFileName('Landing', 'tsx')).toBe('landing.tsx');
    expect(projectFileName('???')).toBe('project.json');
  });
});
