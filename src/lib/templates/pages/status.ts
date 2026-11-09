import type { BuilderNode } from '@/lib/schema';
import { node } from '../helpers';
import type { PageTemplate } from '../types';

/** Buttons centred below a result. */
const actions = (primary: string, secondary: string) =>
  node('Flex', { justify: 'center', gap: 'small', wrap: true }, [
    node('Button', { children: primary, type: 'primary' }),
    node('Button', { children: secondary, type: 'default' }),
  ]);

const result = (props: Record<string, unknown>, children: BuilderNode[]) =>
  node('Result', props, [node('Flex', { vertical: true, gap: 'middle' }, children)]);

export const notFound: PageTemplate = {
  id: 'not-found',
  label: 'Not found (404)',
  description: 'Friendly 404 with a site search, helpful links and a way back home.',
  category: 'status',
  build: () => [
    result(
      {
        status: '404',
        title: 'Page not found',
        subTitle: 'The page you are looking for was moved, renamed or never existed.',
      },
      [
        node('Input.Search', { placeholder: 'Search the site', enterButton: 'Search' }),
        node('Typography.Text', { children: 'Or try one of these:', type: 'secondary' }),
        node('Space', { size: 'middle', wrap: true }, [
          node('Typography.Link', { children: 'Pricing', href: '#' }),
          node('Typography.Link', { children: 'Documentation', href: '#' }),
          node('Typography.Link', { children: 'Help center', href: '#' }),
        ]),
      ],
    ),
    actions('Back to home', 'Contact support'),
  ],
};

export const maintenance: PageTemplate = {
  id: 'maintenance',
  label: 'Maintenance',
  description: 'Scheduled downtime notice with progress, what is being done and where to follow.',
  category: 'status',
  preset: 'midnight',
  build: () => [
    result(
      {
        status: 'warning',
        title: 'We’ll be right back',
        subTitle: 'Scheduled maintenance until 14:00 UTC. Your data is safe.',
      },
      [
        node('Progress', { percent: 65, status: 'active' }),
        node('Timeline', {
          items: [
            { title: '12:00', content: 'Backups taken' },
            { title: '12:30', content: 'Database upgrade in progress' },
            { title: '13:30', content: 'Checks and warm-up' },
          ],
        }),
      ],
    ),
    node('Flex', { justify: 'center', gap: 'small', wrap: true }, [
      node('Typography.Text', { children: 'Follow live updates on our', type: 'secondary' }),
      node('Typography.Link', { children: 'status page', href: '#' }),
    ]),
  ],
};

export const orderConfirmed: PageTemplate = {
  id: 'order-confirmed',
  label: 'Order confirmation',
  description: 'Success message with the order summary, delivery steps and next actions.',
  category: 'status',
  data: [
    {
      name: 'order',
      data: [
        { key: 'number', label: 'Order', children: '#1024' },
        { key: 'total', label: 'Total', children: '$129.90' },
        { key: 'delivery', label: 'Delivery', children: 'Thu, 12 Nov' },
        { key: 'address', label: 'Ship to', children: '1 Market St, Springfield' },
      ],
    },
  ],
  build: (source) => [
    result(
      {
        status: 'success',
        title: 'Thank you, your order is placed',
        subTitle: 'We sent a confirmation to alice@example.com.',
      },
      [
        node('Descriptions', {
          items: { $data: source('order') },
          column: 2,
          size: 'small',
          bordered: true,
        }),
        node('Steps', {
          current: 1,
          size: 'small',
          titlePlacement: 'vertical',
          items: [
            { title: 'Placed' },
            { title: 'Packed' },
            { title: 'Shipped' },
            { title: 'Delivered' },
          ],
        }),
      ],
    ),
    actions('Track order', 'Continue shopping'),
  ],
};
