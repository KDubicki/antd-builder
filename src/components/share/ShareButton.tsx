'use client';

import {
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  LinkOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useState } from 'react';
import { deleteWithToken, postJson } from '@/lib/apiClient';
import { useEditorStore } from '@/lib/editor/store';
import { toProject } from '@/lib/project';
import { formatDay } from './SharedProject';
import { type MyShare, addMyShare, loadMyShares, removeMyShare } from './myShares';

/** Path of a shared project's read-only page. */
export const sharePath = (id: string) => `/s/${id}`;

const shareUrl = (id: string) => new URL(sharePath(id), window.location.origin).href;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Copies a link, reporting the outcome. */
function useCopyLink() {
  const { message } = App.useApp();
  return async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied');
    } catch {
      message.error('Copying is not allowed here; select the link and copy it');
    }
  };
}

function ShareItem({ share, onDeleted }: { share: MyShare; onDeleted: (id: string) => void }) {
  const expired = share.expiresAt !== undefined && new Date(share.expiresAt) <= new Date();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const copy = useCopyLink();

  const remove = async () => {
    const result = await deleteWithToken(`/api/shares/${share.id}`, share.deleteToken);
    // Already gone on the server (deleted elsewhere): drop it from the list too.
    if (result.ok || result.status === 404) onDeleted(share.id);
    else message.error(result.error);
  };

  return (
    <Flex
      component="li"
      align="center"
      gap="small"
      style={{
        padding: `${token.paddingXS}px 0`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex vertical style={{ flex: 1, minWidth: 0 }}>
        <Flex align="center" gap="small" style={{ minWidth: 0 }}>
          <Typography.Text strong ellipsis>
            {share.name}
          </Typography.Text>
          {expired && <Tag>Expired</Tag>}
        </Flex>
        <Typography.Text type="secondary">
          <time dateTime={share.createdAt}>{formatDate(share.createdAt)}</time>
          {share.expiresAt && !expired && (
            <>
              {' · expires '}
              <time dateTime={share.expiresAt}>{formatDay(share.expiresAt)}</time>
            </>
          )}
        </Typography.Text>
      </Flex>
      <Button
        size="small"
        type="text"
        icon={<CopyOutlined />}
        aria-label="Copy link"
        title="Copy link"
        onClick={() => copy(shareUrl(share.id))}
      />
      <Button
        size="small"
        type="text"
        icon={<ExportOutlined />}
        aria-label="Open"
        title="Open"
        href={sharePath(share.id)}
        target="_blank"
      />
      <Popconfirm
        title="Delete this link?"
        description="People who have it won't be able to open the page anymore."
        okText="Delete"
        okButtonProps={{ danger: true }}
        onConfirm={remove}
      >
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label="Delete link"
          title="Delete link"
        />
      </Popconfirm>
    </Flex>
  );
}

/**
 * "Share" button and dialog: creates read-only links to snapshots of the project, and lists
 * the links shared from this browser so they can be copied again or deleted.
 */
export function ShareButton() {
  const { message } = App.useApp();
  const copy = useCopyLink();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);
  const [shares, setShares] = useState<MyShare[]>([]);

  const show = () => {
    setShares(loadMyShares());
    setLatest(null);
    setOpen(true);
  };

  const create = async () => {
    setLoading(true);
    const state = useEditorStore.getState();
    // Version history stays private; the server drops it too.
    const project = { ...toProject(state), versions: [] };
    const result = await postJson<{ id: string; deleteToken: string; expiresAt: string }>(
      '/api/shares',
      project,
    );
    setLoading(false);
    if (!result.ok) {
      message.error(result.error);
      return;
    }
    const { id, deleteToken, expiresAt } = result.value;
    const createdAt = new Date().toISOString();
    setShares(addMyShare({ id, deleteToken, expiresAt, name: state.name, createdAt }));
    setLatest(id);
  };

  return (
    <>
      <Button icon={<ShareAltOutlined />} onClick={show}>
        Share
      </Button>
      <Modal
        title="Share a read-only copy"
        open={open}
        footer={null}
        onCancel={() => setOpen(false)}
      >
        <Flex vertical gap="middle">
          <Typography.Text type="secondary">
            Anyone with a link can view the page as it was when the link was created, and open a
            copy in their own editor. Create a new link to share later changes.
          </Typography.Text>
          {latest ? (
            <Space.Compact>
              <Input
                aria-label="Share link"
                readOnly
                value={shareUrl(latest)}
                onFocus={(event) => event.target.select()}
              />
              <Button type="primary" icon={<CopyOutlined />} onClick={() => copy(shareUrl(latest))}>
                Copy link
              </Button>
            </Space.Compact>
          ) : (
            <Button type="primary" icon={<LinkOutlined />} loading={loading} onClick={create}>
              Create link
            </Button>
          )}
          <Typography.Text strong>Your shared links</Typography.Text>
          {shares.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No links yet" />
          ) : (
            <ul
              aria-label="Your shared links"
              style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 280, overflow: 'auto' }}
            >
              {shares.map((share) => (
                <ShareItem
                  key={share.id}
                  share={share}
                  onDeleted={(id) => {
                    setShares(removeMyShare(id));
                    if (id === latest) setLatest(null);
                    message.success('Link deleted');
                  }}
                />
              ))}
            </ul>
          )}
        </Flex>
      </Modal>
    </>
  );
}
