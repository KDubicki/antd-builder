'use client';

import { theme } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StaticPage } from '@/components/canvas/StaticPage';
import { type PageTemplate, instantiateTemplate } from '@/lib/templates';

/** Width the page is laid out at before scaling: a desktop. */
export const PREVIEW_PAGE_WIDTH = 1200;
const PREVIEW_HEIGHT = 170;

/**
 * A live thumbnail of a template: the real page laid out at desktop width, scaled down to the
 * frame's width and cropped to its top. Purely visual, so hidden from assistive technology and
 * from the pointer.
 */
export function TemplatePreview({ template }: { template: PageTemplate }) {
  const { token } = theme.useToken();
  const content = useMemo(() => instantiateTemplate(template), [template]);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.22);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => element.clientWidth > 0 && setScale(element.clientWidth / PREVIEW_PAGE_WIDTH);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frame}
      aria-hidden
      inert
      data-testid={`template-preview-${template.id}`}
      style={{
        height: PREVIEW_HEIGHT,
        overflow: 'hidden',
        position: 'relative',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: PREVIEW_PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <StaticPage {...content} />
      </div>
    </div>
  );
}
