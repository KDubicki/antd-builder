'use client';

import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { App as AntApp, ConfigProvider, Flex, Layout, Tabs, Tag, Typography, theme } from 'antd';
import { useCallback, useId, useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { DataPanel } from '@/components/data/DataPanel';
import {
  PALETTE_SCROLLER_ATTR,
  autoScroll,
  handleDragEnd,
  usePointerPosition,
} from '@/components/dragDrop';
import { Inspector } from '@/components/inspector/Inspector';
import { HistoryActions } from '@/components/history/HistoryActions';
import { Layers } from '@/components/layers/Layers';
import { Palette } from '@/components/palette/Palette';
import { ProjectActions } from '@/components/project/ProjectActions';
import { useAutosave } from '@/components/project/autosave';
import { ShortcutHelp } from '@/components/ShortcutHelp';
import { SIDE_PANEL_ATTR, useEditorShortcuts } from '@/components/shortcuts';
import { ThemeEditor } from '@/components/theme/ThemeEditor';
import { VersionHistory } from '@/components/versions/VersionHistory';
import { getBlock } from '@/lib/blocks';
import type { DragData } from '@/lib/editor/drop';
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
        // Light like the side panels, so the default (light) header controls stay readable.
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" gap={token.margin}>
        <Typography.Text strong>antd-builder</Typography.Text>
        <HistoryActions />
        <VersionHistory />
        <ShortcutHelp />
      </Flex>
      <ProjectActions />
    </Header>
  );
}

/** Keyboard shortcuts, inside antd's App so they can show confirmations. */
function EditorShortcuts() {
  const { message } = AntApp.useApp();
  useEditorShortcuts(useCallback((text: string) => void message.success(text), [message]));
  return null;
}

export function Editor() {
  const dndId = useId();
  const [dragging, setDragging] = useState<DragData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const pointer = usePointerPosition();
  // Hidden rather than unmounted in preview, so open tabs and layer state survive it.
  const preview = useEditorStore((state) => state.previewMode);
  const customBlocks = useEditorStore((state) => state.customBlocks);
  const panelVisibility = preview ? { display: 'none' } : {};
  useAutosave();

  return (
    <ConfigProvider>
      <AntApp>
        <EditorShortcuts />
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
                style={{ overflow: 'auto', ...panelVisibility }}
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
              <Content style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <CanvasToolbar />
                <div
                  style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
                >
                  <Canvas />
                </div>
              </Content>
              <Sider width={320} theme="light" style={{ overflow: 'auto', ...panelVisibility }}>
                <div {...{ [SIDE_PANEL_ATTR]: '' }}>
                  <Tabs
                    centered
                    items={[
                      { key: 'props', label: 'Properties', children: <Inspector /> },
                      { key: 'theme', label: 'Theme', children: <ThemeEditor /> },
                      { key: 'data', label: 'Data', children: <DataPanel /> },
                    ]}
                  />
                </div>
              </Sider>
            </Layout>
          </Layout>
          <DragOverlay dropAnimation={null}>
            {dragging && (
              <Tag color="blue" style={{ cursor: 'grabbing' }}>
                {dragging.type === 'block'
                  ? (getBlock(dragging.block)?.label ??
                    customBlocks.find((block) => block.id === dragging.block)?.name ??
                    dragging.block)
                  : (getComponentMeta(dragging.component)?.label ?? dragging.component)}
              </Tag>
            )}
          </DragOverlay>
        </DndContext>
      </AntApp>
    </ConfigProvider>
  );
}
