import { render, screen } from '@testing-library/react';
import { Row, Tooltip } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/lib/editor/store';
import { createNode } from '@/lib/registry';
import type { BuilderNode } from '@/lib/schema';
import {
  ColAdapter,
  DrawerPreview,
  ModalPreview,
  TableAdapter,
  TourPreview,
  childNode,
  withTriggerTarget,
} from './adapters';

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

describe('ColAdapter', () => {
  const renderCol = (viewport: 'desktop' | 'mobile' | 'tablet') => {
    useEditorStore.setState({ viewport });
    const { container } = render(
      <Row>
        <ColAdapter span={8} xs={24} md={12}>
          col
        </ColAdapter>
      </Row>,
    );
    return container.querySelector('.ant-col')!;
  };

  it('passes responsive spans through on desktop, where the window decides', () => {
    const col = renderCol('desktop');
    expect(col).toHaveClass('ant-col-8', 'ant-col-xs-24', 'ant-col-md-12');
  });

  it('resolves the span for the device width in tablet and mobile views', () => {
    expect(renderCol('mobile').className).toMatch(/\bant-col-24\b/);
    expect(renderCol('mobile').className).not.toMatch(/ant-col-(xs|md)-/);
    expect(renderCol('tablet').className).toMatch(/\bant-col-12\b/);
  });
});

describe('TableAdapter', () => {
  const columns = [{ title: 'Name', dataIndex: 'name', key: 'name' }];

  it('uses a row key field every row has', () => {
    render(<TableAdapter columns={columns} rowKey="id" dataSource={[{ id: 7, name: 'Ann' }]} />);
    expect(screen.getByText('Ann').closest('tr')).toHaveAttribute('data-row-key', '7');
  });

  it('ignores a row key field some row lacks, without key warnings', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <TableAdapter
        columns={columns}
        rowKey="nope"
        dataSource={[
          { key: 'a', name: 'Ann' },
          { key: 'b', name: 'Bob' },
        ]}
      />,
    );
    expect(screen.getByText('Bob').closest('tr')).toHaveAttribute('data-row-key', 'b');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
