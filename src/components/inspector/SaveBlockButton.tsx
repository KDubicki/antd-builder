'use client';

import { AppstoreAddOutlined } from '@ant-design/icons';
import { App, Button, Flex, Input, Popover } from 'antd';
import { useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';

/** Saves the given node as a reusable custom block, after asking for a name. */
export function SaveBlockButton({ nodeId, defaultName }: { nodeId: string; defaultName: string }) {
  const { message } = App.useApp();
  const saveAsBlock = useEditorStore((state) => state.saveAsBlock);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);

  const save = () => {
    if (!saveAsBlock(nodeId, name)) return;
    setOpen(false);
    message.success('Saved to My blocks in the palette');
  };

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(defaultName);
      }}
      title="Save as block"
      content={
        <Flex gap="small">
          <Input
            aria-label="Block name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onPressEnter={save}
          />
          <Button type="primary" onClick={save}>
            Save
          </Button>
        </Flex>
      }
    >
      <Button
        icon={<AppstoreAddOutlined />}
        aria-label="Save as block"
        title="Save as a reusable block"
      />
    </Popover>
  );
}
