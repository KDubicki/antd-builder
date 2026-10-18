'use client';

import { DeleteOutlined, PlusOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Flex, Form, Input, Popconfirm, Typography, theme } from 'antd';
import { useMemo, useState } from 'react';
import { JsonEditor } from '@/components/JsonEditor';
import { ImportFromUrl, fetchSample } from './ImportFromUrl';
import { useEditorStore } from '@/lib/editor/store';
import { planTable, sourceNameError } from '@/lib/mockData';
import type { DataSource } from '@/lib/schema';

/** Short description of a JSON value's shape, e.g. "List of 3 items". */
export function describeData(data: unknown): string {
  if (Array.isArray(data)) return `List of ${data.length} item${data.length === 1 ? '' : 's'}`;
  if (data !== null && typeof data === 'object') {
    const keys = Object.keys(data).length;
    return `Object with ${keys} key${keys === 1 ? '' : 's'}`;
  }
  return data === null ? 'Empty (null)' : `Single ${typeof data}`;
}

/** Name field: applied as soon as it is valid; an invalid draft shows why and reverts on blur. */
function NameField({ source, otherNames }: { source: DataSource; otherNames: string[] }) {
  const updateDataSource = useEditorStore((state) => state.updateDataSource);
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? source.name;
  const error = draft === null ? null : sourceNameError(draft, otherNames);

  return (
    <Form.Item
      label="Name"
      htmlFor={`data-name-${source.id}`}
      validateStatus={error ? 'error' : undefined}
      help={error ?? undefined}
      style={{ marginBottom: 0 }}
    >
      <Input
        id={`data-name-${source.id}`}
        value={name}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (!sourceNameError(next, otherNames)) updateDataSource(source.id, { name: next });
        }}
        onBlur={() => setDraft(null)}
      />
    </Form.Item>
  );
}

/** Where imported data came from, with a button to fetch it again. */
function SourceUrl({ source, url }: { source: DataSource; url: string }) {
  const updateDataSource = useEditorStore((state) => state.updateDataSource);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const result = await fetchSample(url);
    setLoading(false);
    setError(result.ok ? null : result.error);
    if (result.ok) updateDataSource(source.id, { data: result.value.data });
  };

  return (
    <Flex vertical>
      <Flex align="center" gap="small">
        <Typography.Text type="secondary" ellipsis={{ tooltip: url }} style={{ flex: 1 }}>
          From {url}
        </Typography.Text>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={loading}
          aria-label={`Refresh ${source.name} from its URL`}
          title="Fetch the latest response"
          onClick={refresh}
        />
      </Flex>
      {error && (
        <Typography.Text type="danger" role="alert">
          {error}
        </Typography.Text>
      )}
    </Flex>
  );
}

/** Adds a table of the source's rows to the page, when its data holds a list of objects. */
function CreateTableButton({ source }: { source: DataSource }) {
  const insertDataTable = useEditorStore((state) => state.insertDataTable);
  const usable = useMemo(() => planTable(source.id, source.data) !== null, [source]);
  return (
    <Button
      size="small"
      type="text"
      icon={<TableOutlined />}
      disabled={!usable}
      aria-label={`Create a table from ${source.name}`}
      title={
        usable
          ? 'Add a table of these rows to the page'
          : 'Needs a list of objects, or an object with one'
      }
      onClick={() => insertDataTable(source.id)}
    />
  );
}

function DataSourceCard({ source, otherNames }: { source: DataSource; otherNames: string[] }) {
  const updateDataSource = useEditorStore((state) => state.updateDataSource);
  const removeDataSource = useEditorStore((state) => state.removeDataSource);

  return (
    <Card
      size="small"
      title={<Typography.Text code>{source.name}</Typography.Text>}
      extra={
        <Flex gap={4}>
          <CreateTableButton source={source} />
          <Popconfirm
            title="Delete this data source?"
            description="Props bound to it will be left empty."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeDataSource(source.id)}
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Delete ${source.name}`}
            />
          </Popconfirm>
        </Flex>
      }
    >
      <Form layout="vertical" component="div">
        <Flex vertical gap="small">
          <NameField source={source} otherNames={otherNames} />
          {source.url && <SourceUrl source={source} url={source.url} />}
          <Form.Item
            label="Response (JSON)"
            htmlFor={`data-json-${source.id}`}
            extra={describeData(source.data)}
            style={{ marginBottom: 0 }}
          >
            <JsonEditor
              id={`data-json-${source.id}`}
              value={source.data}
              maxRows={16}
              // Clearing the text leaves an empty (null) response rather than no data source.
              onChange={(value, coalesce) =>
                updateDataSource(
                  source.id,
                  { data: (value ?? null) as DataSource['data'] },
                  { coalesce },
                )
              }
            />
          </Form.Item>
        </Flex>
      </Form>
    </Card>
  );
}

/**
 * The single place for mock data: sample API responses that component props can be bound to,
 * so a mockup shows realistic content and exports with that data.
 */
export function DataPanel() {
  const { token } = theme.useToken();
  const mockData = useEditorStore((state) => state.mockData);
  const addDataSource = useEditorStore((state) => state.addDataSource);

  return (
    <Flex vertical gap="middle" style={{ padding: token.padding }} aria-label="Mock data">
      <Typography.Text type="secondary">
        Sample API responses for your mockup. Bind component props to them in the Properties tab.
      </Typography.Text>
      {mockData.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data sources yet" />
      )}
      {mockData.map((source) => (
        <DataSourceCard
          key={source.id}
          source={source}
          otherNames={mockData.filter((other) => other.id !== source.id).map((o) => o.name)}
        />
      ))}
      <Button icon={<PlusOutlined />} onClick={() => addDataSource()}>
        Add data source
      </Button>
      <ImportFromUrl />
    </Flex>
  );
}
