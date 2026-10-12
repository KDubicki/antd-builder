import { Splitter, Tour } from 'antd';
import {
  Children,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  isValidElement,
} from 'react';
import type { BuilderNode } from '@/lib/schema';

/**
 * Canvas adapters for antd components that read their children's props (rather than just
 * rendering them). On the canvas each child is a `CanvasNode` element carrying its `node`, so
 * the adapter rebuilds the element antd expects from that node and renders the canvas node
 * inside it.
 */

/** The builder node behind a canvas child element, if any. */
export function childNode(child: ReactNode): BuilderNode | undefined {
  if (!isValidElement(child)) return undefined;
  return (child.props as { node?: BuilderNode }).node;
}

/** Splitter takes its panels' props from its children, so each child is wrapped in a real panel. */
export function SplitterAdapter({ children, ...props }: ComponentProps<typeof Splitter>) {
  return (
    <Splitter {...props}>
      {Children.map(children, (child) => (
        <Splitter.Panel {...childNode(child)?.props}>{child}</Splitter.Panel>
      ))}
    </Splitter>
  );
}

/** A splitter panel's own canvas node: the panel itself comes from `SplitterAdapter`. */
export function SplitterPanelBody({ children }: { children?: ReactNode }) {
  return <div style={{ height: '100%' }}>{children}</div>;
}

/**
 * Wraps a trigger component (Dropdown, Tooltip…) for the canvas. Triggers clone their child to
 * attach event handlers and a ref, which a canvas node can't take; the span can, and gives the
 * popup a box to align to.
 */
export function withTriggerTarget<P extends { children?: ReactNode }>(
  Trigger: ComponentType<P>,
): ComponentType<P> {
  function CanvasTrigger({ children, ...props }: P) {
    return (
      <Trigger {...(props as P)}>
        <span style={{ display: 'inline-block', maxWidth: '100%' }}>{children}</span>
      </Trigger>
    );
  }
  CanvasTrigger.displayName = `CanvasTrigger(${Trigger.displayName ?? Trigger.name})`;
  return CanvasTrigger;
}

/**
 * Tour on the canvas: an open Tour masks the whole page, so the canvas shows the current step's
 * panel inline instead (antd's own docs preview it the same way).
 */
export function TourPreview({ steps = [], current = 0, type }: ComponentProps<typeof Tour>) {
  const index = Math.min(Math.max(current, 0), Math.max(steps.length - 1, 0));
  const step = steps[index];
  if (!step) return <Tour._InternalPanelDoNotUseOrYouWillBeFired title="Add tour steps" />;
  return (
    <Tour._InternalPanelDoNotUseOrYouWillBeFired
      {...step}
      type={step.type ?? type}
      current={index}
      total={steps.length}
    />
  );
}
