import { blockData, fromBlock, node } from '../helpers';
import type { PageTemplate } from '../types';

export const dashboard: PageTemplate = {
  id: 'dashboard',
  label: 'Admin dashboard',
  description: 'Top menu, key numbers, recent orders, monthly goals and team activity.',
  category: 'app',
  data: [
    blockData('stats'),
    {
      name: 'orders',
      data: [
        { key: '1', order: '#1024', customer: 'Alice Johnson', status: 'Paid', total: 129.9 },
        { key: '2', order: '#1023', customer: 'Bob Smith', status: 'Shipped', total: 54 },
        { key: '3', order: '#1022', customer: 'Carol White', status: 'Pending', total: 310.5 },
        { key: '4', order: '#1021', customer: 'Dan Brown', status: 'Paid', total: 18.25 },
      ],
    },
  ],
  build: (source) => [
    node('Menu', {
      mode: 'horizontal',
      selectedKeys: ['dashboard'],
      items: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'orders', label: 'Orders' },
        { key: 'customers', label: 'Customers' },
        { key: 'reports', label: 'Reports' },
        { key: 'settings', label: 'Settings' },
      ],
    }),
    fromBlock('page-header', source),
    fromBlock('stats', source),
    // Side by side from 992px, stacked below.
    node('Row', { gutter: 16, verticalGutter: 16 }, [
      node('Col', { span: 24, lg: 16 }, [
        node('Card', { title: 'Recent orders' }, [
          node('Table', {
            columns: [
              { title: 'Order', dataIndex: 'order', key: 'order' },
              { title: 'Customer', dataIndex: 'customer', key: 'customer' },
              { title: 'Status', dataIndex: 'status', key: 'status' },
              { title: 'Total ($)', dataIndex: 'total', key: 'total' },
            ],
            dataSource: { $data: source('orders') },
            pagination: false,
            size: 'small',
            horizontalScroll: true,
          }),
        ]),
      ]),
      node('Col', { span: 24, lg: 8 }, [
        node('Flex', { vertical: true, gap: 'middle' }, [
          node('Card', { title: 'Goals this month' }, [
            node('Flex', { vertical: true }, [
              node('Typography.Text', { children: 'Revenue', type: 'secondary' }),
              node('Progress', { percent: 72 }),
              node('Typography.Text', { children: 'New customers', type: 'secondary' }),
              node('Progress', { percent: 45 }),
              node('Typography.Text', { children: 'Tickets closed', type: 'secondary' }),
              node('Progress', { percent: 100, status: 'success' }),
            ]),
          ]),
          node('Card', { title: 'Activity' }, [
            node('Timeline', {
              items: [
                { title: '09:12', content: 'Alice paid order #1024' },
                { title: '10:40', content: 'Bob’s order #1023 shipped' },
                { title: '13:05', content: 'Carol placed order #1022' },
              ],
            }),
          ]),
        ]),
      ]),
    ]),
  ],
};
