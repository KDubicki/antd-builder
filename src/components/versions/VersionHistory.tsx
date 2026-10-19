'use client';

import { DeleteOutlined, HistoryOutlined, RollbackOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Empty, Flex, Input, Popconfirm, Typography, theme } from 'antd';
import { useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { formatDateTime } from '@/lib/format';
import type { ProjectVersion } from '@/lib/schema';

function VersionItem({ version }: { version: ProjectVersion }) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const restoreVersion = useEditorStore((state) => state.restoreVersion);
  const removeVersion = useEditorStore((state) => state.removeVersion);

  return (
    <Flex
      component="li"
      align="center"
      gap="small"
      style={{
        padding: `${token.paddingSM}px 0`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Flex vertical style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text strong ellipsis>
          {version.name}
        </Typography.Text>
        <Typography.Text type="secondary">
          <time dateTime={version.createdAt}>{formatDateTime(version.createdAt)}</time>
        </Typography.Text>
      </Flex>
      <Popconfirm
        title={`Restore "${version.name}"?`}
        description="It replaces the current page. You can undo this."
        okText="Restore"
        onConfirm={() => {
          restoreVersion(version.id);
          message.success(`Restored "${version.name}"`);
        }}
      >
        <Button size="small" icon={<RollbackOutlined />} aria-label={`Restore ${version.name}`}>
          Restore
        </Button>
      </Popconfirm>
      <Popconfirm
        title={`Delete "${version.name}"?`}
        okText="Delete"
        okButtonProps={{ danger: true }}
        onConfirm={() => removeVersion(version.id)}
      >
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label={`Delete ${version.name}`}
        />
      </Popconfirm>
    </Flex>
  );
}

/** Header button and panel for named project snapshots: save, restore and delete. */
export function VersionHistory() {
  const versions = useEditorStore((state) => state.versions);
  const saveVersion = useEditorStore((state) => state.saveVersion);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const save = () => {
    saveVersion(name);
    setName('');
  };

  return (
    <>
      <Button
        icon={<HistoryOutlined />}
        aria-label="Version history"
        title="Version history"
        onClick={() => setOpen(true)}
      />
      <Drawer title="Version history" open={open} onClose={() => setOpen(false)} size={400}>
        <Flex vertical gap="middle">
          <Typography.Text type="secondary">
            Save named snapshots of the page, theme, mock data and blocks, and go back to them
            later. Versions are saved with the project.
          </Typography.Text>
          <Flex gap="small">
            <Input
              aria-label="Version name"
              placeholder={`Version ${versions.length + 1}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onPressEnter={save}
            />
            <Button type="primary" onClick={save}>
              Save version
            </Button>
          </Flex>
          {versions.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No versions yet" />
          ) : (
            <ul aria-label="Saved versions" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {versions.map((version) => (
                <VersionItem key={version.id} version={version} />
              ))}
            </ul>
          )}
        </Flex>
      </Drawer>
    </>
  );
}
