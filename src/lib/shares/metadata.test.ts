import { describe, expect, it } from 'vitest';
import { toProject } from '@/lib/project';
import { createNode } from '@/lib/registry';
import { createTheme } from '@/lib/theme';
import { shareMetadata } from './metadata';
import { createRoot } from '@/lib/tree';

const project = (children = [createNode('Card', 'c'), createNode('Button', 'b')]) =>
  JSON.stringify(
    toProject({ name: 'Pricing page', root: { ...createRoot(), children }, theme: createTheme() }),
  );

describe('shareMetadata', () => {
  it("titles the page with the project's name and describes it", () => {
    const metadata = shareMetadata(project());
    expect(metadata.title).toBe('Pricing page · antd-builder');
    expect(metadata.description).toBe(
      'A read-only page with 2 components, shared from antd-builder.',
    );
    expect(metadata.openGraph).toMatchObject({ title: 'Pricing page', siteName: 'antd-builder' });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('counts nested components', () => {
    const card = { ...createNode('Card', 'c'), children: [createNode('Button', 'b')] };
    expect(shareMetadata(project([card])).description).toMatch(/with 2 components/);
    expect(shareMetadata(project([createNode('Tag', 't')])).description).toMatch(/1 component,/);
  });

  it('falls back to a generic title, still unindexed', () => {
    for (const json of [null, '{}']) {
      expect(shareMetadata(json)).toEqual({
        title: 'Shared project · antd-builder',
        robots: { index: false, follow: false },
      });
    }
  });
});
