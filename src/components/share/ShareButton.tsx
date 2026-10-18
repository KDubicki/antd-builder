'use client';

import { CopyOutlined, ExportOutlined, ShareAltOutlined } from '@ant-design/icons';
import { App, Button, Flex, Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { postJson } from '@/lib/apiClient';
import { useEditorStore } from '@/lib/editor/store';
import { toProject } from '@/lib/project';

/** Path of a shared project's read-only page. */
export const sharePath = (id: string) => `/s/${id}`;

/** "Share" button: uploads a read-only snapshot of the project and shows its link. */
export function ShareButton() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const share = async () => {
    setLoading(true);
    // Version history stays private; the server drops it too.
    const project = { ...toProject(useEditorStore.getState()), versions: [] };
    const result = await postJson<{ id: string }>('/api/shares', project);
    setLoading(false);
    if (result.ok) setLink(new URL(sharePath(result.value.id), window.location.origin).href);
    else message.error(result.error);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link ?? '');
      message.success('Link copied');
    } catch {
      message.error('Copying is not allowed here; select the link and copy it');
    }
  };

  return (
    <>
      <Button icon={<ShareAltOutlined />} loading={loading} onClick={share}>
        Share
      </Button>
      <Modal
        title="Share a read-only copy"
        open={link !== null}
        onCancel={() => setLink(null)}
        footer={[
          <Button key="open" icon={<ExportOutlined />} href={link ?? undefined} target="_blank">
            Open
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copy}>
            Copy link
          </Button>,
        ]}
      >
        <Flex vertical gap="small">
          <Typography.Text type="secondary">
            Anyone with the link can view the page as it is now and open a copy in their own editor.
            Later changes aren&apos;t included: share again to send them.
          </Typography.Text>
          <Input
            aria-label="Share link"
            readOnly
            value={link ?? ''}
            onFocus={(event) => event.target.select()}
          />
        </Flex>
      </Modal>
    </>
  );
}
