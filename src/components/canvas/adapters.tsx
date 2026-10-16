import { Col, Drawer, Modal, Splitter, Tour } from 'antd';
import {
  Children,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  isValidElement,
} from 'react';
import { colPropsAt } from '@/lib/breakpoints';
import { useEditorStore } from '@/lib/editor/store';
import type { BuilderNode } from '@/lib/schema';
import { viewports } from './CanvasToolbar';

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

/**
 * Grid column that follows the canvas width: in the Tablet and Mobile views it gets the span
 * antd would use at that width, since antd's own breakpoints follow the browser window.
 */
export function ColAdapter(props: ComponentProps<typeof Col>) {
  const width = useEditorStore((state) => viewports[state.viewport].width);
  return <Col {...(width === null ? props : colPropsAt({ ...props }, width))} />;
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

/**
 * Modal on the canvas: a real one covers the editor, so the canvas shows its panel inline with
 * the body content (antd's docs preview it the same way). `open` only matters in the export.
 */
export function ModalPreview({
  title,
  okText,
  cancelText,
  width,
  closable,
  children,
}: ComponentProps<typeof Modal>) {
  return (
    <Modal._InternalPanelDoNotUseOrYouWillBeFired
      title={title}
      closable={closable}
      // The panel passes its props on to the footer, which reads these; its type omits them.
      {...({ okText, cancelText } as object)}
      // Responsive (breakpoint) widths can't be previewed; fall back to antd's default.
      style={{ width: typeof width === 'object' ? 520 : (width ?? 520), maxWidth: '100%' }}
    >
      {children}
    </Modal._InternalPanelDoNotUseOrYouWillBeFired>
  );
}

/** Drawer on the canvas: its panel inline, for the same reason as `ModalPreview`. */
export function DrawerPreview({
  title,
  size,
  closable,
  loading,
  placement,
  children,
}: ComponentProps<typeof Drawer>) {
  return (
    <Drawer._InternalPanelDoNotUseOrYouWillBeFired
      title={title}
      size={size}
      closable={closable}
      loading={loading}
      placement={placement}
    >
      {children}
    </Drawer._InternalPanelDoNotUseOrYouWillBeFired>
  );
}
