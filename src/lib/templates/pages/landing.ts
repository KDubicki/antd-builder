import { blockData, fromBlock, node, section } from '../helpers';
import type { PageTemplate } from '../types';

export const landing: PageTemplate = {
  id: 'landing',
  label: 'Landing page',
  description:
    'Navigation, hero, features, pricing, testimonials, FAQ and a closing call to action.',
  category: 'marketing',
  preset: 'ocean',
  data: [blockData('features'), blockData('pricing'), blockData('testimonials'), blockData('faq')],
  build: (source) => [
    fromBlock('nav-bar', source),
    fromBlock('hero', source),
    section('Everything a page needs', 'From the first sketch to code your team can ship.', [
      fromBlock('features', source),
    ]),
    section('Simple pricing', 'Start free for 14 days. No card needed.', [
      fromBlock('pricing', source),
    ]),
    section('Loved by product teams', null, [fromBlock('testimonials', source)]),
    fromBlock('faq', source),
    node('Card', {}, [
      node('Flex', { vertical: true, align: 'center', gap: 'small' }, [
        node('Typography.Title', { children: 'Ready to build your next page?', level: 3 }),
        node('Typography.Paragraph', {
          children: 'Pick a template, swap in your data and export.',
          type: 'secondary',
        }),
        node('Button', { children: 'Start for free', type: 'primary', size: 'large' }),
      ]),
    ]),
    fromBlock('footer', source),
  ],
};
