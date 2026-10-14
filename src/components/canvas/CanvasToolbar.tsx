'use client';

import {
  DesktopOutlined,
  EditOutlined,
  EyeOutlined,
  MobileOutlined,
  TabletOutlined,
} from '@ant-design/icons';
import { Button, Flex, Segmented, theme } from 'antd';
import type { ReactNode } from 'react';
import { type Viewport, useEditorStore } from '@/lib/editor/store';

/** Canvas widths: `null` fills the editor; the others match common device widths. */
export const viewports: Readonly<
  Record<Viewport, { label: string; width: number | null; icon: ReactNode }>
> = {
  desktop: { label: 'Desktop', width: null, icon: <DesktopOutlined /> },
  tablet: { label: 'Tablet', width: 768, icon: <TabletOutlined /> },
  mobile: { label: 'Mobile', width: 375, icon: <MobileOutlined /> },
};

/** Controls above the canvas: the width preset and preview mode. */
export function CanvasToolbar() {
  const { token } = theme.useToken();
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  const preview = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <Flex
      justify="center"
      align="center"
      gap="small"
      style={{
        padding: `${token.paddingXS}px ${token.padding}px`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
    >
      <Segmented<Viewport>
        aria-label="Canvas width"
        value={viewport}
        onChange={setViewport}
        options={(Object.keys(viewports) as Viewport[]).map((key) => {
          const { label, width, icon } = viewports[key];
          return {
            value: key,
            icon,
            label,
            title: width ? `${label} (${width}px)` : `${label} (full width)`,
          };
        })}
      />
      <Button
        type={preview ? 'primary' : 'default'}
        icon={preview ? <EditOutlined /> : <EyeOutlined />}
        aria-pressed={preview}
        title={preview ? 'Back to editing (Esc)' : 'See the page as users will'}
        onClick={() => setPreviewMode(!preview)}
      >
        {preview ? 'Exit preview' : 'Preview'}
      </Button>
    </Flex>
  );
}
