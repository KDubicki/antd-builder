import type { ComponentMeta, PropDefinition } from './types';

const sizes = ['small', 'large'] as const;
const text = (label: string): PropDefinition => ({ type: 'string', label });

/** Metadata for the antd components available in the palette. */
export const components: readonly ComponentMeta[] = [
  // Layout
  {
    name: 'Flex',
    label: 'Flex',
    category: 'layout',
    description: 'Flexbox container with gap and alignment.',
    props: {
      vertical: { type: 'boolean', label: 'Vertical' },
      wrap: { type: 'boolean', label: 'Wrap' },
      gap: { type: 'enum', label: 'Gap', options: ['small', 'middle', 'large'] },
      justify: {
        type: 'enum',
        label: 'Justify',
        options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
      },
      align: { type: 'enum', label: 'Align', options: ['flex-start', 'center', 'flex-end'] },
    },
    defaultProps: { gap: 'middle' },
    children: 'any',
  },
  {
    name: 'Space',
    label: 'Space',
    category: 'layout',
    description: 'Evenly spaced inline items.',
    props: {
      orientation: { type: 'enum', label: 'Orientation', options: ['horizontal', 'vertical'] },
      size: { type: 'enum', label: 'Size', options: ['small', 'middle', 'large'] },
      wrap: { type: 'boolean', label: 'Wrap' },
    },
    defaultProps: {},
    children: 'any',
  },
  {
    name: 'Row',
    label: 'Grid row',
    category: 'layout',
    description: '24-column grid row. Holds columns.',
    props: {
      gutter: { type: 'number', label: 'Gutter (px)', min: 0 },
      justify: {
        type: 'enum',
        label: 'Justify',
        options: ['start', 'center', 'end', 'space-between', 'space-around'],
      },
      align: { type: 'enum', label: 'Align', options: ['top', 'middle', 'bottom'] },
    },
    defaultProps: { gutter: 16 },
    children: ['Col'],
  },
  {
    name: 'Col',
    label: 'Grid column',
    category: 'layout',
    description: 'Grid column spanning 1–24 units.',
    props: {
      span: { type: 'number', label: 'Span', min: 1, max: 24 },
      offset: { type: 'number', label: 'Offset', min: 0, max: 23 },
    },
    defaultProps: { span: 12 },
    children: 'any',
    parents: ['Row'],
  },
  {
    name: 'Card',
    label: 'Card',
    category: 'layout',
    description: 'Bordered container with an optional title.',
    props: {
      title: text('Title'),
      size: { type: 'enum', label: 'Size', options: ['small'] },
      variant: { type: 'enum', label: 'Variant', options: ['outlined', 'borderless'] },
      hoverable: { type: 'boolean', label: 'Hoverable' },
    },
    defaultProps: { title: 'Card title' },
    children: 'any',
  },
  {
    name: 'Divider',
    label: 'Divider',
    category: 'layout',
    description: 'Horizontal rule, optionally with a title.',
    props: {
      children: text('Title'),
      titlePlacement: {
        type: 'enum',
        label: 'Title placement',
        options: ['start', 'center', 'end'],
      },
      variant: { type: 'enum', label: 'Variant', options: ['solid', 'dashed', 'dotted'] },
      plain: { type: 'boolean', label: 'Plain title' },
    },
    defaultProps: {},
    children: 'none',
  },

  // General
  {
    name: 'Button',
    label: 'Button',
    category: 'general',
    description: 'Triggers an action.',
    props: {
      children: text('Label'),
      type: {
        type: 'enum',
        label: 'Type',
        options: ['default', 'primary', 'dashed', 'link', 'text'],
      },
      size: { type: 'enum', label: 'Size', options: sizes },
      danger: { type: 'boolean', label: 'Danger' },
      block: { type: 'boolean', label: 'Full width' },
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: { children: 'Button', type: 'primary' },
    children: 'none',
  },

  // Typography
  {
    name: 'Typography.Title',
    label: 'Title',
    category: 'typography',
    description: 'Heading (h1–h5).',
    props: {
      children: text('Text'),
      level: { type: 'enum', label: 'Level', options: [1, 2, 3, 4, 5] },
    },
    defaultProps: { children: 'Heading', level: 2 },
    children: 'none',
  },
  {
    name: 'Typography.Paragraph',
    label: 'Paragraph',
    category: 'typography',
    description: 'Block of body text.',
    props: {
      children: { type: 'string', label: 'Text', multiline: true },
      type: { type: 'enum', label: 'Type', options: ['secondary', 'success', 'warning', 'danger'] },
    },
    defaultProps: { children: 'Paragraph text.' },
    children: 'none',
  },
  {
    name: 'Typography.Text',
    label: 'Text',
    category: 'typography',
    description: 'Inline text.',
    props: {
      children: text('Text'),
      type: { type: 'enum', label: 'Type', options: ['secondary', 'success', 'warning', 'danger'] },
      strong: { type: 'boolean', label: 'Bold' },
      italic: { type: 'boolean', label: 'Italic' },
      code: { type: 'boolean', label: 'Code' },
    },
    defaultProps: { children: 'Text' },
    children: 'none',
  },

  // Data entry
  {
    name: 'Form',
    label: 'Form',
    category: 'data-entry',
    description: 'Form with labelled fields.',
    props: {
      layout: { type: 'enum', label: 'Layout', options: ['horizontal', 'vertical', 'inline'] },
      size: { type: 'enum', label: 'Size', options: sizes },
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: { layout: 'vertical' },
    children: 'any',
  },
  {
    name: 'Form.Item',
    label: 'Form field',
    category: 'data-entry',
    description: 'Labelled field inside a form.',
    props: {
      label: text('Label'),
      name: text('Field name'),
      required: { type: 'boolean', label: 'Required' },
      tooltip: text('Tooltip'),
      extra: text('Help text'),
    },
    defaultProps: { label: 'Label' },
    children: 'any',
    parents: ['Form'],
  },
  {
    name: 'Input',
    label: 'Input',
    category: 'data-entry',
    description: 'Single-line text input.',
    props: {
      placeholder: text('Placeholder'),
      size: { type: 'enum', label: 'Size', options: sizes },
      variant: { type: 'enum', label: 'Variant', options: ['outlined', 'filled', 'borderless'] },
      allowClear: { type: 'boolean', label: 'Clearable' },
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: { placeholder: 'Enter text' },
    children: 'none',
  },
  {
    name: 'InputNumber',
    label: 'Number input',
    category: 'data-entry',
    description: 'Numeric input with steppers.',
    props: {
      placeholder: text('Placeholder'),
      min: { type: 'number', label: 'Min' },
      max: { type: 'number', label: 'Max' },
      step: { type: 'number', label: 'Step' },
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: {},
    children: 'none',
  },
  {
    name: 'Checkbox',
    label: 'Checkbox',
    category: 'data-entry',
    description: 'Checkbox with a label.',
    props: {
      children: text('Label'),
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: { children: 'Checkbox' },
    children: 'none',
  },
  {
    name: 'Switch',
    label: 'Switch',
    category: 'data-entry',
    description: 'On/off toggle.',
    props: {
      size: { type: 'enum', label: 'Size', options: ['small'] },
      disabled: { type: 'boolean', label: 'Disabled' },
    },
    defaultProps: {},
    children: 'none',
  },

  // Feedback
  {
    name: 'Alert',
    label: 'Alert',
    category: 'feedback',
    description: 'Inline status message.',
    props: {
      title: text('Title'),
      description: { type: 'string', label: 'Description', multiline: true },
      type: { type: 'enum', label: 'Type', options: ['info', 'success', 'warning', 'error'] },
      showIcon: { type: 'boolean', label: 'Show icon' },
    },
    defaultProps: { title: 'Alert message', type: 'info', showIcon: true },
    children: 'none',
  },
  {
    name: 'Tag',
    label: 'Tag',
    category: 'feedback',
    description: 'Small label for categorising.',
    props: {
      children: text('Text'),
      color: {
        type: 'enum',
        label: 'Color',
        options: ['success', 'processing', 'warning', 'error', 'blue', 'green', 'red', 'gold'],
      },
      variant: { type: 'enum', label: 'Variant', options: ['filled', 'solid', 'outlined'] },
    },
    defaultProps: { children: 'Tag' },
    children: 'none',
  },
];
