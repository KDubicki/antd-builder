'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ConfigProvider, Typography, theme } from 'antd';
import { type MouseEvent, useMemo } from 'react';
import type { DragData } from '@/lib/editor/drop';
import { ROOT_ID, useEditorStore } from '@/lib/editor/store';
import { resolveProps } from '@/lib/mockData';
import { codePropValues, getComponentMeta } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { toThemeConfig } from '@/lib/theme';
import { viewports } from './CanvasToolbar';
import { NODE_ID_ATTR } from './nodeChain';
import { renderers } from './renderers';

export const CANVAS_DROPPABLE_ID = 'canvas';

function EmptyContainer() {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        minHeight: 48,
        minWidth: 120,
        display: 'grid',
        placeItems: 'center',
        border: `1px dashed ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        color: token.colorTextTertiary,
        fontSize: token.fontSizeSM,
      }}
    >
      Drop components here
    </div>
  );
}

/**
 * Remount key from `default*` props (defaultValue, defaultChecked…): antd reads them only on
 * mount, so without a remount inspector edits wouldn't show on the canvas.
 */
function defaultsKey(props: Readonly<Record<string, unknown>>): string {
  const defaults = Object.entries(props).filter(([key]) => /^default[A-Z]/.test(key));
  return defaults.length > 0 ? JSON.stringify(defaults) : 'static';
}

/** Stands in for an empty container's children in preview: invisible, but still an element. */
const NoChildren = () => <span />;

function CanvasNode({ node }: { node: BuilderNode }) {
  const select = useEditorStore((state) => state.select);
  const preview = useEditorStore((state) => state.previewMode);
  const { setNodeRef, listeners } = useDraggable({
    id: `node:${node.id}`,
    data: { type: 'node', nodeId: node.id, component: node.component } satisfies DragData,
    disabled: node.id === ROOT_ID || preview,
  });

  const mockData = useEditorStore((state) => state.mockData);
  const Component = renderers[node.component];
  const meta = getComponentMeta(node.component);
  // Bound props show their mock data; code props fill in what the page can't store.
  const props = useMemo(() => {
    if (!meta) return node.props;
    return { ...codePropValues(meta), ...resolveProps(node.props, meta.props, mockData) };
  }, [meta, node.props, mockData]);
  if (!Component || !meta) {
    return <Typography.Text type="danger">Unknown component: {node.component}</Typography.Text>;
  }

  const onClick = (event: MouseEvent) => {
    event.stopPropagation();
    select(node.id);
  };

  // `display: contents` keeps the wrapper out of layout (e.g. Row > Col still works) while the
  // DOM ancestry lets drops and clicks resolve to the right node.
  return (
    <div
      {...{ [NODE_ID_ATTR]: node.id }}
      style={{ display: 'contents' }}
      ref={(el) => setNodeRef((el?.firstElementChild as HTMLElement | null) ?? el)}
      onClick={preview ? undefined : onClick}
      {...(preview ? {} : listeners)}
    >
      {meta.children === 'none' ? (
        <Component key={defaultsKey(props)} {...props} />
      ) : (
        <Component key={defaultsKey(props)} {...props}>
          {node.children.length === 0 ? (
            preview ? (
              <NoChildren />
            ) : (
              <EmptyContainer />
            )
          ) : node.children.length === 1 ? (
            // A lone child goes in as an element, not an array: single-child wrappers like
            // Dropdown or Tooltip use React.Children.only.
            <CanvasNode node={node.children[0]!} />
          ) : (
            node.children.map((child) => <CanvasNode key={child.id} node={child} />)
          )}
        </Component>
      )}
    </div>
  );
}

function CanvasSurface() {
  const { token } = theme.useToken();
  const root = useEditorStore((state) => state.root);
  const selectedId = useEditorStore((state) => state.selectedId);
  const select = useEditorStore((state) => state.select);
  const viewport = useEditorStore((state) => state.viewport);
  const preview = useEditorStore((state) => state.previewMode);
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID, disabled: preview });
  const width = viewports[viewport].width;

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas"
      data-viewport={viewport}
      data-preview={preview || undefined}
      onClick={preview ? undefined : () => select(null)}
      style={{
        // Fills the editor's scroll area (a flex column) and grows with the page.
        flex: '1 0 auto',
        // Device presets get a fixed-width page centred on the editor background.
        width: width ?? undefined,
        marginInline: width ? 'auto' : undefined,
        boxShadow: width ? token.boxShadowTertiary : undefined,
        padding: token.paddingLG,
        // Fixed-position components (FloatButton…) are placed relative to the canvas, not the editor.
        contain: 'layout',
        background: isOver ? token.colorPrimaryBg : token.colorBgContainer,
        transition: `background ${token.motionDurationFast}`,
      }}
    >
      {selectedId && (
        <style>{`[${NODE_ID_ATTR}="${CSS.escape(selectedId)}"] > * {
          outline: 2px solid ${token.colorPrimary};
          outline-offset: 2px;
        }`}</style>
      )}
      <CanvasNode node={root} />
    </div>
  );
}

/** The canvas renders under the project theme, so theme edits preview live. */
export function Canvas() {
  const projectTheme = useEditorStore((state) => state.theme);
  const themeConfig = useMemo(() => toThemeConfig(projectTheme), [projectTheme]);
  return (
    <ConfigProvider theme={themeConfig}>
      <CanvasSurface />
    </ConfigProvider>
  );
}
