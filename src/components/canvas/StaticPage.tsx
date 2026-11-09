'use client';

import { ConfigProvider, theme } from 'antd';
import { useMemo } from 'react';
import { resolveProps } from '@/lib/mockData';
import { antdProps, codePropValues, getComponentMeta } from '@/lib/registry';
import type { BuilderNode, DataSource, ProjectTheme } from '@/lib/schema';
import { toThemeConfig } from '@/lib/theme';
import { renderers } from './renderers';

/**
 * A node rendered like the canvas in preview, but from props rather than the editor store: no
 * selection, drag and drop or context menu. Unknown components render nothing. The `node` prop
 * is what canvas adapters (e.g. Splitter) read from their children.
 */
export function StaticNode({
  node,
  mockData,
}: {
  node: BuilderNode;
  mockData: readonly DataSource[];
}) {
  const Component = renderers[node.component];
  const meta = getComponentMeta(node.component);
  if (!Component || !meta) return null;
  const props = {
    ...codePropValues(meta),
    ...antdProps(meta, resolveProps(node.props, meta.props, mockData)),
  };
  if (meta.children === 'none') return <Component {...props} />;
  return (
    <Component {...props}>
      {node.children.length === 0 ? (
        <span />
      ) : node.children.length === 1 ? (
        <StaticNode node={node.children[0]!} mockData={mockData} />
      ) : (
        node.children.map((child) => <StaticNode key={child.id} node={child} mockData={mockData} />)
      )}
    </Component>
  );
}

function Surface({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  return (
    <div style={{ padding: token.paddingLG, background: token.colorBgContainer }}>{children}</div>
  );
}

/** A whole page under its theme, read-only: for thumbnails and other previews. */
export function StaticPage({
  root,
  theme: projectTheme,
  mockData,
}: {
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: readonly DataSource[];
}) {
  const themeConfig = useMemo(() => toThemeConfig(projectTheme), [projectTheme]);
  return (
    <ConfigProvider theme={themeConfig}>
      <Surface>
        <StaticNode node={root} mockData={mockData} />
      </Surface>
    </ConfigProvider>
  );
}
