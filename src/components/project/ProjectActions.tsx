'use client';

import { FolderOpenOutlined, SaveOutlined } from '@ant-design/icons';
import { App, Button, Input, Space } from 'antd';
import { type ChangeEvent, useRef } from 'react';
import { DEFAULT_PROJECT_NAME, useEditorStore } from '@/lib/editor/store';
import { parseProject, projectFileName, toProject } from '@/lib/project';
import { ShareButton } from '@/components/share/ShareButton';
import { ExportCode } from './ExportCode';
import { downloadFile } from './download';

/** Project name plus Open/Save of the project JSON file. */
export function ProjectActions() {
  const { message } = App.useApp();
  const name = useEditorStore((state) => state.name);
  const setName = useEditorStore((state) => state.setName);
  const fileInput = useRef<HTMLInputElement>(null);

  const save = () => {
    const project = toProject(useEditorStore.getState());
    downloadFile(
      projectFileName(project.name),
      JSON.stringify(project, null, 2),
      'application/json',
    );
  };

  const open = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-opening the same file
    if (!file) return;

    const result = parseProject(await file.text());
    if (result.ok) {
      useEditorStore.getState().loadProject(result.content);
      message.success(`Opened "${result.content.name}"`);
    } else {
      message.error(result.error);
    }
  };

  return (
    <Space>
      <Input
        aria-label="Project name"
        value={name}
        placeholder={DEFAULT_PROJECT_NAME}
        variant="filled"
        style={{ width: 220 }}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => name.trim() === '' && setName(DEFAULT_PROJECT_NAME)}
      />
      <Button icon={<FolderOpenOutlined />} onClick={() => fileInput.current?.click()}>
        Open
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        data-testid="project-file-input"
        onChange={open}
      />
      <Button icon={<SaveOutlined />} onClick={save}>
        Save
      </Button>
      <ExportCode />
      <ShareButton />
    </Space>
  );
}
