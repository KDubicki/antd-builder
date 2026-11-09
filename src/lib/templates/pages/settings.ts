import type { BuilderNode } from '@/lib/schema';
import { node } from '../helpers';
import type { PageTemplate } from '../types';

const toggle = (title: string, detail: string) =>
  node('Flex', { justify: 'space-between', align: 'center', gap: 'middle' }, [
    node('Flex', { vertical: true }, [
      node('Typography.Text', { children: title, strong: true }),
      node('Typography.Text', { children: detail, type: 'secondary' }),
    ]),
    node('Switch'),
  ]);

const field = (label: string, name: string, input: BuilderNode) =>
  node('Form.Item', { label, name }, [input]);

export const settings: PageTemplate = {
  id: 'settings',
  label: 'Account settings',
  description:
    'Section menu with profile form, notification switches, plan details and a danger zone.',
  category: 'account',
  data: [
    {
      name: 'billing',
      data: [
        { key: 'plan', label: 'Plan', children: 'Team (monthly)' },
        { key: 'seats', label: 'Seats', children: '8 of 10 used' },
        { key: 'renews', label: 'Renews on', children: '1 December 2026' },
        { key: 'card', label: 'Payment method', children: 'Visa ending 4242' },
      ],
    },
  ],
  build: (source) => [
    node('Typography.Title', { children: 'Settings', level: 2 }),
    node('Row', { gutter: 24, verticalGutter: 16 }, [
      node('Col', { span: 24, lg: 6 }, [
        node('Menu', {
          mode: 'inline',
          selectedKeys: ['profile'],
          items: [
            { key: 'profile', label: 'Profile' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'billing', label: 'Plan & billing' },
            { key: 'danger', label: 'Danger zone' },
          ],
        }),
      ]),
      node('Col', { span: 24, lg: 18 }, [
        node('Flex', { vertical: true, gap: 'middle' }, [
          node('Card', { title: 'Profile' }, [
            node('Flex', { vertical: true, gap: 'middle' }, [
              node('Flex', { align: 'center', gap: 'middle' }, [
                node('Avatar', { children: 'AL', size: 'large' }),
                node('Button', { children: 'Change photo', type: 'default' }),
              ]),
              node('Form', { layout: 'vertical' }, [
                field('Full name', 'name', node('Input', { placeholder: 'Ada Lovelace' })),
                field('Email', 'email', node('Input', { placeholder: 'ada@example.com' })),
                field(
                  'Bio',
                  'bio',
                  node('Input.TextArea', {
                    placeholder: 'A few words about you',
                    rows: 3,
                    maxLength: 160,
                    showCount: true,
                  }),
                ),
                field(
                  'Language',
                  'language',
                  node('Select', {
                    placeholder: 'Pick a language',
                    options: [
                      { value: 'en', label: 'English' },
                      { value: 'pl', label: 'Polski' },
                      { value: 'de', label: 'Deutsch' },
                    ],
                  }),
                ),
                node('Button', { children: 'Save changes', type: 'primary' }),
              ]),
            ]),
          ]),
          node('Card', { title: 'Notifications' }, [
            node('Flex', { vertical: true, gap: 'middle' }, [
              toggle('Product updates', 'News about features and improvements.'),
              toggle('Weekly summary', 'A digest of your team’s activity every Monday.'),
              toggle('Security alerts', 'Sign-ins from new devices and password changes.'),
            ]),
          ]),
          node('Card', { title: 'Plan & billing' }, [
            node('Flex', { vertical: true, gap: 'middle' }, [
              node('Descriptions', {
                items: { $data: source('billing') },
                column: 2,
                bordered: true,
                size: 'small',
              }),
              node('Space', { wrap: true }, [
                node('Button', { children: 'Change plan', type: 'default' }),
                node('Button', { children: 'Download invoices', type: 'link' }),
              ]),
            ]),
          ]),
          node('Card', { title: 'Danger zone' }, [
            node('Flex', { justify: 'space-between', align: 'center', wrap: true, gap: 'middle' }, [
              node('Typography.Text', {
                children: 'Deleting your account removes all projects for good.',
                type: 'secondary',
              }),
              node(
                'Popconfirm',
                {
                  title: 'Delete your account?',
                  description: 'This cannot be undone.',
                  okText: 'Delete',
                },
                [node('Button', { children: 'Delete account', danger: true, type: 'default' })],
              ),
            ]),
          ]),
        ]),
      ]),
    ]),
  ],
};
