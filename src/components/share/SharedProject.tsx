'use client';

import { DndContext } from '@dnd-kit/core';
import { EditOutlined } from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  ConfigProvider,
  Flex,
  Layout,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { ViewportSwitch } from '@/components/canvas/CanvasToolbar';
import { AUTOSAVE_KEY } from '@/components/project/autosave';
import { useEditorStore } from '@/lib/editor/store';
import { type ProjectContent, parseProject, toProject } from '@/lib/project';

/** The project saved in this browser's editor, if any. */
function localProjectName(): string | null {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    const result = saved ? parseProject(saved) : null;
    return result?.ok ? result.content.name : null;
  } catch {
    return null;
  }
}

/** Makes the shared project this browser's editor project. */
function saveAsLocalProject(content: ProjectContent) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(toProject(content)));
  } catch {
    // Storage unavailable: the editor still opens with the project loaded below.
  }
}

function OpenInEditorButton({ content }: { content: ProjectContent }) {
  const { modal } = AntApp.useApp();
  const router = useRouter();
  const openInEditor = () => {
    saveAsLocalProject(content);
    // The store survives client navigation: leave preview so the editor opens editable.
    useEditorStore.getState().setPreviewMode(false);
    router.push('/');
  };
  const open = () => {
    const current = localProjectName();
    if (current === null) return openInEditor();
    modal.confirm({
      title: 'Replace your project?',
      content: `"${current}" in this browser's editor will be replaced by "${content.name}". Save it first if you want to keep it.`,
      okText: 'Replace and open',
      okButtonProps: { danger: true },
      onOk: openInEditor,
    });
  };
  return (
    <Button type="primary" icon={<EditOutlined />} onClick={open}>
      Open in editor
    </Button>
  );
}

function SharedHeader({ content }: { content: ProjectContent }) {
  const { token } = theme.useToken();
  return (
    <Layout.Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: token.margin,
        paddingInline: token.paddingLG,
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex align="center" gap="small" style={{ minWidth: 0 }}>
        <Typography.Text strong ellipsis>
          {content.name}
        </Typography.Text>
        <Tag>Read-only</Tag>
      </Flex>
      <ViewportSwitch />
      <OpenInEditorButton content={content} />
    </Layout.Header>
  );
}

/**
 * Read-only view of a shared project: the page in preview at a chosen width, plus a way to
 * copy it into the viewer's own editor. It never touches the viewer's saved project otherwise.
 */
export function SharedProject({ json }: { json: string }) {
  const dndId = useId();
  const result = useMemo(() => parseProject(json), [json]);
  // The editor store is module state, shared across requests on the server: load it only in
  // the browser, and show the page once it holds the shared project.
  const loaded = useEditorStore((state) => result.ok && state.root === result.content.root);
  useEffect(() => {
    if (!result.ok) return;
    const store = useEditorStore.getState();
    store.loadProject(result.content);
    store.setPreviewMode(true);
  }, [result]);

  return (
    <ConfigProvider>
      <AntApp>
        {result.ok ? (
          <Layout style={{ minHeight: '100vh' }}>
            <SharedHeader content={result.content} />
            <Layout.Content style={{ display: 'flex', flexDirection: 'column' }}>
              {loaded ? (
                <DndContext id={dndId}>
                  <Canvas />
                </DndContext>
              ) : (
                <Spin style={{ margin: 'auto' }} />
              )}
            </Layout.Content>
          </Layout>
        ) : (
          <Typography.Paragraph type="danger" style={{ padding: 24 }}>
            This shared project can&apos;t be opened: {result.error}
          </Typography.Paragraph>
        )}
      </AntApp>
    </ConfigProvider>
  );
}
