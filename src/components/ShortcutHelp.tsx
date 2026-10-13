'use client';

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Modal, Table, Typography } from 'antd';
import { type Shortcut, shortcuts } from '@/components/shortcuts';
import { useEditorStore } from '@/lib/editor/store';

function Keys({ keys }: { keys: Shortcut['keys'] }) {
  return (
    <span>
      {keys.map((key, i) => (
        <span key={key}>
          {i > 0 && ' + '}
          <Typography.Text keyboard>{key}</Typography.Text>
        </span>
      ))}
    </span>
  );
}

/** Header button and dialog listing the editor's keyboard shortcuts (also opened with `?`). */
export function ShortcutHelp() {
  const open = useEditorStore((state) => state.shortcutHelpOpen);
  const setOpen = useEditorStore((state) => state.setShortcutHelpOpen);

  return (
    <>
      <Button
        icon={<QuestionCircleOutlined />}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen(true)}
      />
      <Modal title="Keyboard shortcuts" open={open} footer={null} onCancel={() => setOpen(false)}>
        <Table<Shortcut>
          size="small"
          pagination={false}
          showHeader={false}
          rowKey="description"
          dataSource={[...shortcuts]}
          columns={[
            { key: 'keys', width: 170, render: (_, shortcut) => <Keys keys={shortcut.keys} /> },
            { key: 'description', dataIndex: 'description' },
          ]}
        />
      </Modal>
    </>
  );
}
