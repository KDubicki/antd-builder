import { describe, expect, it } from 'vitest';
import type { BuilderNode } from '@/lib/schema';
import { collectImports, nodeToJsx } from '.';

const tree: BuilderNode = {
  id: 'root',
  component: 'Form',
  props: { layout: 'vertical' },
  children: [
    {
      id: 'field',
      component: 'Form.Item',
      props: { label: 'Name', required: true },
      children: [{ id: 'input', component: 'Input', props: {}, children: [] }],
    },
  ],
};

describe('nodeToJsx', () => {
  it('renders nested nodes with string and non-string props', () => {
    expect(nodeToJsx(tree)).toBe(
      [
        '<Form layout="vertical">',
        '  <Form.Item label="Name" required={true}>',
        '    <Input />',
        '  </Form.Item>',
        '</Form>',
      ].join('\n'),
    );
  });
});

describe('collectImports', () => {
  it('collects top-level antd component names', () => {
    expect([...collectImports(tree)].sort()).toEqual(['Form', 'Input']);
  });
});
