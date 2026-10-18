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
  // A full row each on phones, three across from 576px.
  node('Col', { span: 8, xs: 24, sm: 8 }, [
    node('Card', {}, [node('Statistic', { title, value: { $data: sourceId, path }, ...props })]),
  ]);

const planCard = (index: number, sourceId: string, featured = false) => {
  const plan = (field: string) => ({ $data: sourceId, path: `${index}.${field}` });
  return node('Col', { span: 8, xs: 24, sm: 8 }, [
    node('Card', { title: plan('name') }, [
      node('Statistic', { value: plan('price'), prefix: '$', suffix: '/ month' }),
      node('Typography.Paragraph', { children: plan('description'), type: 'secondary' }),
      node('Button', {
        children: 'Choose plan',
        block: true,
        ...(featured ? { type: 'primary' } : {}),
      }),
    ]),
  ]);
};

const footerLink = (children: string) =>
  node('Typography.Link', { children, href: '#', type: 'secondary' });

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
      node('Row', { gutter: 16, verticalGutter: 16 }, [
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
          horizontalScroll: true,
        }),
      ]),
  },
  {
    id: 'pricing',
    label: 'Pricing plans',
    description: 'Three plan cards with prices, bound to a `plans` response.',
    component: 'Row',
    data: {
      name: 'plans',
      data: [
        { name: 'Starter', price: 9, description: 'For side projects and trying things out.' },
        { name: 'Team', price: 29, description: 'For small teams shipping together.' },
        { name: 'Business', price: 79, description: 'For companies that need more control.' },
      ],
    },
    build: (sourceId) =>
      node('Row', { gutter: 16, verticalGutter: 16 }, [
        planCard(0, sourceId),
        planCard(1, sourceId, true),
        planCard(2, sourceId),
      ]),
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Heading and accordion of questions from a `faqs` response.',
    component: 'Flex',
    data: {
      name: 'faqs',
      data: [
        {
          key: '1',
          label: 'Can I change plans later?',
          children: 'Yes, upgrade or downgrade at any time.',
        },
        {
          key: '2',
          label: 'Is there a free trial?',
          children: 'Every plan starts with 14 days free.',
        },
        {
          key: '3',
          label: 'How do I cancel?',
          children: 'From the billing page, in one click.',
        },
      ],
    },
    build: (sourceId) =>
      node('Flex', { vertical: true, gap: 'middle' }, [
        node('Typography.Title', { children: 'Frequently asked questions', level: 3 }),
        node('Collapse', { items: { $data: sourceId }, accordion: true }),
      ]),
  },
  {
    id: 'contact-form',
    label: 'Contact form',
    description: 'Card with name, email and message fields and a send button.',
    component: 'Card',
    build: () =>
      node('Card', { title: 'Contact us' }, [
        node('Form', { layout: 'vertical' }, [
          node('Form.Item', { label: 'Name', name: 'name', required: true }, [
            node('Input', { placeholder: 'Your name' }),
          ]),
          node('Form.Item', { label: 'Email', name: 'email', required: true }, [
            node('Input', { placeholder: 'you@example.com' }),
          ]),
          node('Form.Item', { label: 'Message', name: 'message' }, [
            node('Input.TextArea', { placeholder: 'How can we help?', rows: 4 }),
          ]),
          node('Form.Item', {}, [node('Button', { children: 'Send message', type: 'primary' })]),
        ]),
      ]),
  },
  {
    id: 'footer',
    label: 'Footer',
    description: 'Divider, copyright and links, wrapping on narrow screens.',
    component: 'Flex',
    build: () =>
      node('Flex', { vertical: true }, [
        node('Divider'),
        node('Flex', { justify: 'space-between', align: 'center', wrap: true, gap: 'small' }, [
          node('Typography.Text', { children: '© 2026 Your company', type: 'secondary' }),
          node('Space', { size: 'middle', wrap: true }, [
            footerLink('Privacy'),
            footerLink('Terms'),
            footerLink('Contact'),
          ]),
        ]),
      ]),
  },
];

export function getBlock(id: string): Block | undefined {
  return blocks.find((block) => block.id === id);
}
