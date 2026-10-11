'use client';

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { App as AntApp, ConfigProvider, Layout, Tag, Typography, theme } from 'antd';
import { useEffect, useId, useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { nodeChainAt } from '@/components/canvas/nodeChain';
import { INSPECTOR_LABEL, Inspector } from '@/components/inspector/Inspector';
import { Palette } from '@/components/palette/Palette';
import { type DragData, planDrop } from '@/lib/editor/drop';
import { useEditorStore } from '@/lib/editor/store';
import { getComponentMeta } from '@/lib/registry';

const { Header, Sider, Content } = Layout;

function AppHeader() {
  const { token } = theme.useToken();
  return (
    <Header>
      <Typography.Text style={{ color: token.colorTextLightSolid }} strong>
        antd-builder
      </Typography.Text>
    </Header>
  );
}

/** Pointer position at the end of a drag, in viewport coordinates. */
function dropPoint({ activatorEvent, delta }: DragEndEvent): { x: number; y: number } | null {
  if (!(activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent)) {
    return null;
  }
  return { x: activatorEvent.clientX + delta.x, y: activatorEvent.clientY + delta.y };
}

export function handleDragEnd(event: DragEndEvent) {
  const data = event.active.data.current as DragData | undefined;
  const point = dropPoint(event);
  if (!data || !event.over || !point) return;

  const { root, addNode, moveNode } = useEditorStore.getState();
  const action = planDrop(root, data, nodeChainAt(point.x, point.y));
  if (action?.type === 'add') addNode(action.component, action.target);
  if (action?.type === 'move') moveNode(action.nodeId, action.target);
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Inspector controls (switches, selects) keep focus after edits; Delete must not hit the node. */
function isInspectorTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest(`[aria-label="${INSPECTOR_LABEL}"]`);
}

/** Delete/Backspace removes the selected node, Escape clears the selection. */
function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const { selectedId, removeNode, select } = useEditorStore.getState();
      if (event.key === 'Escape') select(null);
      const isDelete = event.key === 'Delete' || event.key === 'Backspace';
      if (isDelete && selectedId && !isInspectorTarget(event.target)) {
        event.preventDefault();
        removeNode(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function Editor() {
  const dndId = useId();
  const [dragging, setDragging] = useState<DragData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  useEditorShortcuts();

  return (
    <ConfigProvider>
      <AntApp>
        <DndContext
          id={dndId}
          sensors={sensors}
          onDragStart={(event: DragStartEvent) =>
            setDragging((event.active.data.current as DragData | undefined) ?? null)
          }
          onDragEnd={(event) => {
            setDragging(null);
            handleDragEnd(event);
          }}
          onDragCancel={() => setDragging(null)}
        >
          <Layout style={{ height: '100vh' }}>
            <AppHeader />
            <Layout>
              <Sider width={260} theme="light" style={{ overflow: 'auto' }}>
                <Palette />
              </Sider>
              <Content style={{ overflow: 'auto' }}>
                <Canvas />
              </Content>
              <Sider width={320} theme="light" style={{ overflow: 'auto' }}>
                <Inspector />
              </Sider>
            </Layout>
          </Layout>
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <Tag color="blue" style={{ cursor: 'grabbing' }}>
                {getComponentMeta(dragging.component)?.label ?? dragging.component}
              </Tag>
            )}
          </DragOverlay>
        </DndContext>
      </AntApp>
    </ConfigProvider>
  );
}
