import { getComponentMeta } from '@/lib/registry';
import { node } from '../helpers';
import type { PageTemplate } from '../types';

/** The registry's offline placeholder picture, so the page needs no network (and passes the CSP). */
const picture = () => getComponentMeta('Image')!.defaultProps.src;

const related = [
  { name: 'Trail Runner GTX', price: 139 },
  { name: 'City Walker', price: 89 },
  { name: 'Studio Trainer', price: 99 },
  { name: 'Race Day Elite', price: 189 },
];

export const product: PageTemplate = {
  id: 'product',
  label: 'Product page',
  description:
    'Gallery, price, rating, size picker, add-to-cart, details tabs and related products.',
  category: 'content',
  preset: 'sunset',
  data: [
    {
      name: 'product',
      data: {
        name: 'Cloud Runner 3',
        price: 119.99,
        reviews: '128 reviews',
        description:
          'A light, cushioned running shoe for daily miles. Breathable knit upper, recycled sole.',
      },
    },
    { name: 'related', data: related },
  ],
  build: (source) => {
    const item = (path: string) => ({ $data: source('product'), path });
    const other = (index: number, field: string) => ({
      $data: source('related'),
      path: `${index}.${field}`,
    });
    return [
      node('Breadcrumb', {
        items: [{ title: 'Shop', href: '#' }, { title: 'Running', href: '#' }, { title: 'Shoes' }],
      }),
      node('Row', { gutter: 32, verticalGutter: 24 }, [
        node('Col', { span: 12, xs: 24, md: 12 }, [
          node('Flex', { vertical: true, gap: 'small' }, [
            node('Image', { src: picture(), alt: 'Cloud Runner 3, side view' }),
            node('Space', { wrap: true }, [
              node('Image', { src: picture(), alt: 'Top view', width: 72, preview: false }),
              node('Image', { src: picture(), alt: 'Sole', width: 72, preview: false }),
              node('Image', { src: picture(), alt: 'On foot', width: 72, preview: false }),
            ]),
          ]),
        ]),
        node('Col', { span: 12, xs: 24, md: 12 }, [
          node('Flex', { vertical: true, gap: 'middle' }, [
            node('Flex', { gap: 'small' }, [
              node('Tag', { children: 'Bestseller', color: 'gold' }),
              node('Tag', { children: 'Free returns', color: 'green' }),
            ]),
            node('Typography.Title', { children: item('name'), level: 2 }),
            node('Flex', { align: 'center', gap: 'small' }, [
              node('Rate', { defaultValue: 4.5, allowHalf: true, disabled: true }),
              node('Typography.Text', { children: item('reviews'), type: 'secondary' }),
            ]),
            node('Statistic', { value: item('price'), prefix: '$', precision: 2 }),
            node('Typography.Paragraph', { children: item('description'), type: 'secondary' }),
            node('Typography.Text', { children: 'Size (EU)', strong: true }),
            node('Radio.Group', {
              optionType: 'button',
              defaultValue: '42',
              options: ['40', '41', '42', '43', '44', '45'].map((size) => ({
                value: size,
                label: size,
              })),
            }),
            node('Flex', { gap: 'small', wrap: true }, [
              node('InputNumber', { min: 1, max: 10, placeholder: 'Qty' }),
              node('Button', { children: 'Add to cart', type: 'primary', size: 'large' }),
              node('Button', { children: 'Save for later', type: 'default', size: 'large' }),
            ]),
            node('Alert', {
              title: 'Free delivery over $50 · 30-day returns',
              type: 'success',
              showIcon: true,
            }),
          ]),
        ]),
      ]),
      node('Tabs', {
        items: [
          {
            key: 'details',
            label: 'Details',
            children: 'Knit upper, foam midsole, 8 mm drop, 260 g (EU 42).',
          },
          { key: 'shipping', label: 'Shipping', children: 'Ships in 1–2 working days.' },
          { key: 'reviews', label: 'Reviews', children: '“Comfortable from the first run.”' },
        ],
      }),
      node('Flex', { vertical: true, gap: 'middle' }, [
        node('Typography.Title', { children: 'You may also like', level: 3 }),
        node(
          'Row',
          { gutter: 16, verticalGutter: 16 },
          related.map((_, index) =>
            node('Col', { span: 6, xs: 12, md: 6 }, [
              node('Card', { title: other(index, 'name'), size: 'small', hoverable: true }, [
                node('Statistic', { value: other(index, 'price'), prefix: '$' }),
              ]),
            ]),
          ),
        ),
      ]),
    ];
  },
};
