import type { DataSource, BuilderNode } from '@/lib/schema';

/** A ready-made fragment of page: a small tree, optionally reading from its own mock data. */
export interface Block {
  id: string;
  label: string;
  description: string;
  /** Component at the block's root, which decides where it can be dropped. */
  component: string;
  /** Mock data the block reads. Inserting reuses a data source of the same name if there is one. */
  data?: Pick<DataSource, 'name' | 'data'>;
  /** Builds the tree with fresh ids; `sourceId` is the id of the block's data source. */
  build: (sourceId: string) => BuilderNode;
}

function node(
  component: string,
  props: Record<string, unknown> = {},
  children: BuilderNode[] = [],
): BuilderNode {
  return { id: crypto.randomUUID(), component, props, children };
}

const statTile = (title: string, sourceId: string, path: string, props = {}) =>
  node('Col', { span: 8 }, [
    node('Card', {}, [node('Statistic', { title, value: { $data: sourceId, path }, ...props })]),
  ]);

export const blocks: readonly Block[] = [
  {
    id: 'page-header',
    label: 'Page header',
    description: 'Page title with a primary action on the right.',
    component: 'Flex',
    build: () =>
      node('Flex', { justify: 'space-between', align: 'center' }, [
        node('Typography.Title', { children: 'Dashboard', level: 2 }),
        node('Button', { children: 'New item', type: 'primary' }),
      ]),
  },
  {
    id: 'login-form',
    label: 'Sign-in form',
    description: 'Card with email and password fields and a submit button.',
    component: 'Card',
    build: () =>
      node('Card', { title: 'Sign in' }, [
        node('Form', { layout: 'vertical' }, [
          node('Form.Item', { label: 'Email', name: 'email', required: true }, [
            node('Input', { placeholder: 'you@example.com' }),
          ]),
          node('Form.Item', { label: 'Password', name: 'password', required: true }, [
            node('Input.Password', { placeholder: 'Password' }),
          ]),
          node('Form.Item', {}, [
            node('Button', { children: 'Sign in', type: 'primary', block: true }),
          ]),
        ]),
      ]),
  },
  {
    id: 'stats',
    label: 'Stats row',
    description: 'Three statistic tiles bound to a `stats` response.',
    component: 'Row',
    data: { name: 'stats', data: { users: 1128, orders: 93, revenue: 12450.5 } },
    build: (sourceId) =>
      node('Row', { gutter: 16 }, [
        statTile('Active users', sourceId, 'users'),
        statTile('Orders', sourceId, 'orders'),
        statTile('Revenue', sourceId, 'revenue', { precision: 2, prefix: '$' }),
      ]),
  },
  {
    id: 'user-table',
    label: 'User table',
    description: 'Card with a table of rows from a `users` response.',
    component: 'Card',
    data: {
      name: 'users',
      data: [
        { name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', key: '1' },
        { name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', key: '2' },
        { name: 'Carol White', email: 'carol@example.com', role: 'Viewer', key: '3' },
      ],
    },
    build: (sourceId) =>
      node('Card', { title: 'Users' }, [
        node('Table', {
          columns: [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Email', dataIndex: 'email', key: 'email' },
            { title: 'Role', dataIndex: 'role', key: 'role' },
          ],
          dataSource: { $data: sourceId },
        }),
      ]),
  },
];

export function getBlock(id: string): Block | undefined {
  return blocks.find((block) => block.id === id);
}
