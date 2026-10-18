'use client';

import { CloudDownloadOutlined } from '@ant-design/icons';
import { Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';
import { postJson } from '@/lib/apiClient';
import { useEditorStore } from '@/lib/editor/store';
import { sourceNameFromUrl } from '@/lib/mockData';
import type { DataSource } from '@/lib/schema';

/** Fetches a URL's JSON through the server, which can reach APIs that don't allow CORS. */
export function fetchSample(url: string) {
  return postJson<{ data: DataSource['data'] }>('/api/data/fetch', { url });
}

/** "Import from URL": adds a data source holding a real API's response. */
export function ImportFromUrl() {
  const addDataSource = useEditorStore((state) => state.addDataSource);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const input = url.trim();
    if (!input) return;
    setLoading(true);
    const result = await fetchSample(input);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // The server accepted it, so it parses; keep the normalized form.
    const href = new URL(input).href;
    addDataSource(sourceNameFromUrl(href), { data: result.value.data, url: href });
    setUrl('');
    setError(null);
  };

  return (
    <Form.Item
      label="Import from URL"
      htmlFor="data-import-url"
      validateStatus={error ? 'error' : undefined}
      help={error ?? 'Fetches a sample response from a public API.'}
      layout="vertical"
      style={{ marginBottom: 0 }}
    >
      <Flex gap="small">
        <Input
          id="data-import-url"
          type="url"
          value={url}
          placeholder="https://api.example.com/users"
          spellCheck={false}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          onPressEnter={submit}
        />
        <Button
          icon={<CloudDownloadOutlined />}
          loading={loading}
          disabled={url.trim() === ''}
          onClick={submit}
        >
          Import
        </Button>
      </Flex>
    </Form.Item>
  );
}
