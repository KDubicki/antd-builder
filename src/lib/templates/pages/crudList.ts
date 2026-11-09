import { node } from '../helpers';
import type { PageTemplate } from '../types';

const customers = (
  [
    ['Alice Johnson', 'alice@example.com', 'Business', 'Active', 2480],
    ['Bob Smith', 'bob@example.com', 'Team', 'Active', 870],
    ['Carol White', 'carol@example.com', 'Starter', 'Trial', 0],
    ['Dan Brown', 'dan@example.com', 'Team', 'Churned', 310],
    ['Eve Martin', 'eve@example.com', 'Business', 'Active', 5120],
    ['Frank Moore', 'frank@example.com', 'Starter', 'Active', 108],
  ] as const
).map(([name, email, plan, status, spent], index) => ({
  name,
  email,
  plan,
  status,
  spent,
  key: String(index + 1),
}));

export const crudList: PageTemplate = {
  id: 'crud-list',
  label: 'Customer list',
  description: 'Searchable, filterable table of records with page actions and bulk-edit hint.',
  category: 'app',
  data: [{ name: 'customers', data: customers }],
  build: (source) => [
    node('Breadcrumb', { items: [{ title: 'Home', href: '#' }, { title: 'Customers' }] }),
    node('Flex', { justify: 'space-between', align: 'center', wrap: true, gap: 'small' }, [
      node('Typography.Title', { children: 'Customers', level: 2 }),
      node('Space', { wrap: true }, [
        node('Button', { children: 'Export CSV', type: 'default' }),
        node('Button', { children: 'Add customer', type: 'primary' }),
      ]),
    ]),
    node('Card', {}, [
      node('Flex', { vertical: true, gap: 'middle' }, [
        node('Flex', { wrap: true, gap: 'small' }, [
          node('Input.Search', { placeholder: 'Search by name or email', allowClear: true }),
          node('Select', {
            placeholder: 'Plan',
            allowClear: true,
            options: [
              { value: 'starter', label: 'Starter' },
              { value: 'team', label: 'Team' },
              { value: 'business', label: 'Business' },
            ],
          }),
          node('Segmented', {
            options: ['All', 'Active', 'Trial', 'Churned'],
            defaultValue: 'All',
          }),
          node('DatePicker.RangePicker', { placeholder: ['Joined from', 'to'] }),
        ]),
        node('Alert', {
          title: 'Select rows to change their plan or remove them in bulk.',
          type: 'info',
          showIcon: true,
        }),
        node('Table', {
          columns: [
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Email', dataIndex: 'email', key: 'email' },
            { title: 'Plan', dataIndex: 'plan', key: 'plan' },
            { title: 'Status', dataIndex: 'status', key: 'status' },
            { title: 'Spent ($)', dataIndex: 'spent', key: 'spent' },
          ],
          dataSource: { $data: source('customers') },
          horizontalScroll: true,
        }),
      ]),
    ]),
  ],
};
