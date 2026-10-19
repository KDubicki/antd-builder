'use client';

import type { DragEndEvent } from '@dnd-kit/core';
import { useEffect, useRef } from 'react';
import { nodeChainAt } from '@/components/canvas/nodeChain';
import { type DragData, planDrop } from '@/lib/editor/drop';
import { useEditorStore } from '@/lib/editor/store';
import { pathTo } from '@/lib/tree';

export interface Point {
  x: number;
  y: number;
}

/**
 * Pointer position at the end of a drag, in viewport coordinates: the tracked `pointer` when
 * known. The fallback, activator position plus dnd-kit's `delta`, drifts when a scroll container
 * of the dragged item scrolls mid-drag, because `delta` includes that scroll.
 */
function dropPoint({ activatorEvent, delta }: DragEndEvent, pointer?: Point | null): Point | null {
  if (pointer) return pointer;
  if (!(activatorEvent instanceof PointerEvent || activatorEvent instanceof MouseEvent)) {
    return null;
  }
  return { x: activatorEvent.clientX + delta.x, y: activatorEvent.clientY + delta.y };
}

/** Adds or moves the dragged component to wherever on the canvas it was dropped. */
export function handleDragEnd(event: DragEndEvent, pointer?: Point | null) {
  const data = event.active.data.current as DragData | undefined;
  const point = dropPoint(event, pointer);
  if (!data || !event.over || !point) return;

  const { root, addNode, insertBlock, moveNode } = useEditorStore.getState();
  const action = planDrop(root, data, nodeChainAt(point.x, point.y));
  if (action?.type === 'add') addNode(action.component, action.target);
  if (action?.type === 'block') insertBlock(action.block, action.target);
  if (action?.type === 'move') moveNode(action.nodeId, action.target);
}

/**
 * Adds a palette component or block as if it were dropped on the selected component: inside it
 * when it accepts it, otherwise after it or one of its ancestors. With nothing selected it goes at
 * the end of the page. Returns whether there was a place for it.
 */
export function addAtSelection(data: DragData): boolean {
  const { root, selectedId, addNode, insertBlock } = useEditorStore.getState();
  const chain = selectedId
    ? pathTo(root, selectedId)
        .map((node) => node.id)
        .reverse()
    : [];
  const action = planDrop(root, data, chain);
  if (action?.type === 'add') addNode(action.component, action.target);
  if (action?.type === 'block') insertBlock(action.block, action.target);
  return action !== null;
}

/** Tracks the pointer's viewport position, so drops resolve where the pointer really is. */
export function usePointerPosition() {
  const position = useRef<Point | null>(null);
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      position.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    return () => window.removeEventListener('pointermove', onMove, { capture: true });
  }, []);
  return position;
}

export const PALETTE_SCROLLER_ATTR = 'data-palette-scroller';

/** Auto-scroll while dragging, except the palette: scrolling the list being dragged from never helps. */
export const autoScroll = {
  canScroll: (element: Element) => !element.hasAttribute(PALETTE_SCROLLER_ATTR),
};
