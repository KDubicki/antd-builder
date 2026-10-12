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
import { App as AntApp, ConfigProvider, Flex, Layout, Tabs, Tag, Typography, theme } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { nodeChainAt } from '@/components/canvas/nodeChain';
import { Inspector } from '@/components/inspector/Inspector';
import { Layers } from '@/components/layers/Layers';
import { HistoryActions } from '@/components/history/HistoryActions';
import { Palette } from '@/components/palette/Palette';
import { ProjectActions } from '@/components/project/ProjectActions';
import { useAutosave } from '@/components/project/autosave';
import { ThemeEditor } from '@/components/theme/ThemeEditor';
import { type DragData, planDrop } from '@/lib/editor/drop';
import { useEditorStore } from '@/lib/editor/store';
import { getComponentMeta } from '@/lib/registry';

const { Header, Sider, Content } = Layout;

function AppHeader() {
  const { token } = theme.useToken();
  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: token.margin,
        paddingInline: token.paddingLG,
      }}
    >
      <Flex align="center" gap={token.margin}>
        <Typography.Text style={{ color: token.colorTextLightSolid }} strong>
          antd-builder
        </Typography.Text>
        <HistoryActions />
      </Flex>
      <ProjectActions />
    </Header>
  );
}

interface Point {
  x: number;
  y: number;
}

/**
 * Pointer position at the end of a drag, in viewport coordinates: the tracked `pointer` when
 * known. The fallback, activator position plus dnd-kit's `delta`, drifts when a scroll container
 * of the dragged item scrolls mid-drag, because `delta` includes that scroll.
 */
function dropPoint({ activatorEvent, delta }: DragEndEvent, pointer?: Point | null): Point | null {
  if (pointer) return pointer;
  if (!(activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent)) {
    return null;
  }
  return { x: activatorEvent.clientX + delta.x, y: activatorEvent.clientY + delta.y };
}

export function handleDragEnd(event: DragEndEvent, pointer?: Point | null) {
  const data = event.active.data.current as DragData | undefined;
  const point = dropPoint(event, pointer);
  if (!data || !event.over || !point) return;

  const { root, addNode, moveNode } = useEditorStore.getState();
  const action = planDrop(root, data, nodeChainAt(point.x, point.y));
  if (action?.type === 'add') addNode(action.component, action.target);
  if (action?.type === 'move') moveNode(action.nodeId, action.target);
}

/** Tracks the pointer's viewport position, so drops resolve where the pointer really is. */
function usePointerPosition() {
  const position = useRef<Point | null>(null);
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      position.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    return () => window.removeEventListener('pointermove', onMove, { capture: true });
  }, []);
  return position;
}

const PALETTE_SCROLLER_ATTR = 'data-palette-scroller';

/** Auto-scroll while dragging, except the palette: scrolling the list being dragged from never helps. */
const autoScroll = {
  canScroll: (element: Element) => !element.hasAttribute(PALETTE_SCROLLER_ATTR),
};

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

const SIDE_PANEL_ATTR = 'data-side-panel';

/** Side-panel controls (switches, selects) keep focus after edits; Delete must not hit the node. */
function isSidePanelTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest(`[${SIDE_PANEL_ATTR}]`);
}

/** Whether the user has highlighted page text, which Ctrl/Cmd+C should copy natively. */
function hasTextSelection(): boolean {
  const selection = window.getSelection();
  return !!selection && !selection.isCollapsed && selection.toString() !== '';
}

/**
 * Delete/Backspace removes the selected node, Ctrl/Cmd+D duplicates it, Ctrl/Cmd+C/X/V copy,
 * cut and paste nodes, Escape clears the selection, Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or
 * Ctrl+Y redoes. Text fields keep their own native shortcuts.
 */
function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const state = useEditorStore.getState();
      const { selectedId, removeNode, duplicateNode, select, undo, redo } = state;
      const { copyNode, cutNode, pasteNode } = state;
      if (event.key === 'Escape') select(null);
      const isMod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (isMod && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      } else if (isMod && key === 'z') {
        event.preventDefault();
        undo();
      }
      if (isMod && (key === 'c' || key === 'x') && selectedId && !hasTextSelection()) {
        event.preventDefault();
        if (key === 'c') copyNode(selectedId);
        else cutNode(selectedId);
      }
      if (isMod && key === 'v' && pasteNode()) event.preventDefault();
      if (isMod && key === 'd' && selectedId) {
        event.preventDefault(); // browsers bookmark the page on Ctrl/Cmd+D
        duplicateNode(selectedId);
      }
      const isDelete = event.key === 'Delete' || event.key === 'Backspace';
      if (isDelete && selectedId && !isSidePanelTarget(event.target)) {
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
  const pointer = usePointerPosition();
  useEditorShortcuts();
  useAutosave();

  return (
    <ConfigProvider>
      <AntApp>
        <DndContext
          id={dndId}
          sensors={sensors}
          autoScroll={autoScroll}
          onDragStart={(event: DragStartEvent) =>
            setDragging((event.active.data.current as DragData | undefined) ?? null)
          }
          onDragEnd={(event) => {
            setDragging(null);
            handleDragEnd(event, pointer.current);
          }}
          onDragCancel={() => setDragging(null)}
        >
          <Layout style={{ height: '100vh' }}>
            <AppHeader />
            <Layout>
              <Sider
                width={260}
                theme="light"
                style={{ overflow: 'auto' }}
                {...{ [PALETTE_SCROLLER_ATTR]: '' }}
              >
                <Tabs
                  centered
                  items={[
                    { key: 'components', label: 'Components', children: <Palette /> },
                    { key: 'layers', label: 'Layers', children: <Layers /> },
                  ]}
                />
              </Sider>
              <Content style={{ overflow: 'auto' }}>
                <Canvas />
              </Content>
              <Sider width={320} theme="light" style={{ overflow: 'auto' }}>
                <div {...{ [SIDE_PANEL_ATTR]: '' }}>
                  <Tabs
                    centered
                    items={[
                      { key: 'props', label: 'Properties', children: <Inspector /> },
                      { key: 'theme', label: 'Theme', children: <ThemeEditor /> },
                    ]}
                  />
                </div>
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
