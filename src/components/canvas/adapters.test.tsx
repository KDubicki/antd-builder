import { render, screen } from '@testing-library/react';
import { Tooltip } from 'antd';
import { describe, expect, it } from 'vitest';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import { DrawerPreview, ModalPreview, TourPreview, childNode, withTriggerTarget } from './adapters';

/** Stands in for `CanvasNode`, which carries its node as a prop. */
const Holder: (props: { node: BuilderNode }) => null = () => null;

describe('childNode', () => {
  it('reads the builder node from a canvas child element', () => {
    const node = createNode('Tag', 't');
    expect(childNode(<Holder node={node} />)).toBe(node);
  });

  it('is undefined for text and plain elements', () => {
    expect(childNode('text')).toBeUndefined();
    expect(childNode(<div />)).toBeUndefined();
  });
});

describe('withTriggerTarget', () => {
  it('wraps the child in a span that the trigger can attach to', () => {
    const CanvasTooltip = withTriggerTarget(Tooltip);
    expect(CanvasTooltip.displayName).toMatch(/^CanvasTrigger\(/);
    render(
      <CanvasTooltip title="Hint">
        <b>child</b>
      </CanvasTooltip>,
    );
    expect(screen.getByText('child').parentElement?.tagName).toBe('SPAN');
  });
});

describe('TourPreview', () => {
  const steps = [
    { title: 'One', description: 'First' },
    { title: 'Two', description: 'Second' },
  ];

  it('shows the current step with its position', () => {
    render(<TourPreview steps={steps} current={1} />);
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('clamps an out-of-range step', () => {
    render(<TourPreview steps={steps} current={9} />);
    expect(screen.getByText('Two')).toBeInTheDocument();
  });

  it('asks for steps when there are none', () => {
    render(<TourPreview />);
    expect(screen.getByText('Add tour steps')).toBeInTheDocument();
  });
});

describe('ModalPreview', () => {
  it('shows the dialog inline with its body and footer texts', () => {
    render(
      <ModalPreview title="Rename" okText="Save" cancelText="Back" width={400}>
        <p>Body</p>
      </ModalPreview>,
    );
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('falls back to the default width for responsive widths', () => {
    const { container } = render(<ModalPreview width={{ md: 600 }} />);
    expect(container.querySelector('.ant-modal')).toHaveStyle({ width: '520px' });
  });
});

describe('DrawerPreview', () => {
  it('shows the drawer panel inline', () => {
    render(
      <DrawerPreview title="Filters">
        <p>Body</p>
      </DrawerPreview>,
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
