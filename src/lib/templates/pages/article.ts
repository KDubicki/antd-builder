import { node } from '../helpers';
import type { PageTemplate } from '../types';

export const article: PageTemplate = {
  id: 'article',
  label: 'Blog article',
  description:
    'Readable column with author, contents links, callout, milestones, tags and comments.',
  category: 'content',
  preset: 'forest',
  data: [
    {
      name: 'article',
      data: {
        title: 'How we rebuilt our admin panel in two weeks',
        meta: '9 Nov 2026 · 6 min read',
        author: 'Maria Lopez',
        initials: 'ML',
        bio: 'CTO at Brightly. Writes about frontend architecture and small teams.',
      },
    },
    {
      name: 'comments',
      data: [
        { key: '1', title: 'Tom: The part about shared blocks saved us a sprint.' },
        { key: '2', title: 'Aiko: Would love a follow-up on the data layer!' },
      ],
    },
  ],
  build: (source) => {
    const post = (path: string) => ({ $data: source('article'), path });
    const heading = (children: string) => node('Typography.Title', { children, level: 3 });
    const paragraph = (children: string) => node('Typography.Paragraph', { children });
    return [
      node('Row', { justify: 'center' }, [
        node('Col', { span: 16, xs: 24, lg: 16 }, [
          node('Flex', { vertical: true, gap: 'middle' }, [
            node('Breadcrumb', {
              items: [{ title: 'Blog', href: '#' }, { title: 'Engineering' }],
            }),
            node('Typography.Title', { children: post('title'), level: 1 }),
            node('Flex', { align: 'center', gap: 'small' }, [
              node('Avatar', { children: post('initials') }),
              node('Flex', { vertical: true }, [
                node('Typography.Text', { children: post('author'), strong: true }),
                node('Typography.Text', { children: post('meta'), type: 'secondary' }),
              ]),
            ]),
            node('Anchor', {
              direction: 'horizontal',
              affix: false,
              items: [
                { key: 'why', href: '#why', title: 'Why' },
                { key: 'how', href: '#how', title: 'How' },
                { key: 'learned', href: '#learned', title: 'What we learned' },
              ],
            }),
            heading('Why we rebuilt it'),
            paragraph(
              'Our old panel grew one screen at a time. Every table looked a little different, and every new page meant copying the closest old one and fixing what broke.',
            ),
            heading('How we did it'),
            paragraph(
              'We mocked every screen with real antd components first, bound them to sample API responses, and exported the code once the team agreed on the design.',
            ),
            node('Alert', {
              title: 'Tip',
              description: 'Save the pieces you repeat (filters, page headers) as blocks first.',
              type: 'info',
              showIcon: true,
            }),
            node('Timeline', {
              items: [
                { title: 'Day 1', content: 'Inventory of every screen' },
                { title: 'Day 4', content: 'Shared blocks and theme agreed' },
                { title: 'Day 10', content: 'All screens mocked with sample data' },
                { title: 'Day 14', content: 'Exported, wired to the API, shipped' },
              ],
            }),
            heading('What we learned'),
            paragraph(
              'Agreeing on the page before writing code removed most of our review rounds. The code we exported needed data fetching and little else.',
            ),
            node('Flex', { gap: 'small', wrap: true }, [
              node('Tag', { children: 'react' }),
              node('Tag', { children: 'antd' }),
              node('Tag', { children: 'design systems' }),
            ]),
            node('Divider'),
            node('Card', { size: 'small' }, [
              node('Flex', { align: 'center', gap: 'middle' }, [
                node('Avatar', { children: post('initials'), size: 'large' }),
                node('Flex', { vertical: true }, [
                  node('Typography.Text', { children: post('author'), strong: true }),
                  node('Typography.Text', { children: post('bio'), type: 'secondary' }),
                ]),
              ]),
            ]),
            node('Typography.Title', { children: 'Comments', level: 4 }),
            node('Listy', { items: { $data: source('comments') } }),
            node('Form', { layout: 'vertical' }, [
              node('Form.Item', { label: 'Add a comment', name: 'comment' }, [
                node('Input.TextArea', { placeholder: 'Share your thoughts', rows: 3 }),
              ]),
              node('Button', { children: 'Post comment', type: 'primary' }),
            ]),
          ]),
        ]),
      ]),
    ];
  },
};
