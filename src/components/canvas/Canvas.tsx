'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Typography, theme } from 'antd';
import type { MouseEvent } from 'react';
import type { DragData } from '@/lib/editor/drop';
import { ROOT_ID, useEditorStore } from '@/lib/editor/store';
import { getComponentMeta } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
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

function CanvasNode({ node }: { node: BuilderNode }) {
  const select = useEditorStore((state) => state.select);
  const { setNodeRef, listeners } = useDraggable({
    id: `node:${node.id}`,
    data: { type: 'node', nodeId: node.id, component: node.component } satisfies DragData,
    disabled: node.id === ROOT_ID,
  });

  const Component = renderers[node.component];
  const meta = getComponentMeta(node.component);
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
      onClick={onClick}
      {...listeners}
    >
      {meta.children === 'none' ? (
        <Component {...node.props} />
      ) : (
        <Component {...node.props}>
          {node.children.length > 0 ? (
            node.children.map((child) => <CanvasNode key={child.id} node={child} />)
          ) : (
            <EmptyContainer />
          )}
        </Component>
      )}
    </div>
  );
}

export function Canvas() {
  const { token } = theme.useToken();
  const root = useEditorStore((state) => state.root);
  const selectedId = useEditorStore((state) => state.selectedId);
  const select = useEditorStore((state) => state.select);
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas"
      onClick={() => select(null)}
      style={{
        minHeight: '100%',
        padding: token.paddingLG,
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
