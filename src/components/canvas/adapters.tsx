import { Splitter } from 'antd';
import { Children, type ComponentProps, type ReactNode, isValidElement } from 'react';
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
