'use client';

import { CodeOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { App, Button, Modal, Typography, theme } from 'antd';
import { useState } from 'react';
import { generatePage } from '@/lib/codegen';
import { useEditorStore } from '@/lib/editor/store';
import { projectFileName } from '@/lib/project';
import { downloadFile } from './download';

/** "Export code" button: shows the generated TSX page with copy and download actions. */
export function ExportCode() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [source, setSource] = useState<string | null>(null);
  const name = useEditorStore((state) => state.name);

  const open = () => {
    try {
      setSource(generatePage(useEditorStore.getState()));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not generate code');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source ?? '');
      message.success('Copied to clipboard');
    } catch {
      message.error('Copying is not allowed here; use Download instead');
    }
  };

  return (
    <>
      <Button icon={<CodeOutlined />} onClick={open}>
        Export code
      </Button>
      <Modal
        title="Generated code"
        open={source !== null}
        width={860}
        onCancel={() => setSource(null)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={copy}>
            Copy
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => downloadFile(projectFileName(name, 'tsx'), source ?? '', 'text/plain')}
          >
            Download {projectFileName(name, 'tsx')}
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          A React + TypeScript page using antd. Drop it into any app with antd installed.
        </Typography.Paragraph>
        <pre
          aria-label="Generated TSX"
          style={{
            margin: 0,
            maxHeight: '60vh',
            overflow: 'auto',
            padding: token.padding,
            borderRadius: token.borderRadius,
            background: token.colorFillTertiary,
            fontFamily: token.fontFamilyCode,
            fontSize: token.fontSizeSM,
          }}
        >
          <code>{source}</code>
        </pre>
      </Modal>
    </>
  );
}
