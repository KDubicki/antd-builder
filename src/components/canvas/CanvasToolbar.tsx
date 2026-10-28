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

/**
 * Canvas widths: `null` fills the editor; the others match common device widths. `key` picks
 * the preset from the keyboard.
 */
export const viewports: Readonly<
  Record<Viewport, { label: string; width: number | null; icon: ReactNode; key: string }>
> = {
  desktop: { label: 'Desktop', width: null, icon: <DesktopOutlined />, key: '1' },
  tablet: { label: 'Tablet', width: 768, icon: <TabletOutlined />, key: '2' },
  mobile: { label: 'Mobile', width: 375, icon: <MobileOutlined />, key: '3' },
};

/** The preview toggle's key. */
export const PREVIEW_KEY = 'P';

/** The canvas width preset. */
export function ViewportSwitch() {
  const viewport = useEditorStore((state) => state.viewport);
  const setViewport = useEditorStore((state) => state.setViewport);
  return (
    <Segmented<Viewport>
      aria-label="Canvas width"
      value={viewport}
      onChange={setViewport}
      options={(Object.keys(viewports) as Viewport[]).map((key) => {
        const { label, width, icon, key: shortcut } = viewports[key];
        return {
          value: key,
          icon,
          label,
          title: `${label} (${width ? `${width}px` : 'full width'}, key ${shortcut})`,
        };
      })}
    />
  );
}

/** Controls above the canvas: the width preset and preview mode. */
export function CanvasToolbar() {
  const { token } = theme.useToken();
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
      <ViewportSwitch />
      <Button
        type={preview ? 'primary' : 'default'}
        icon={preview ? <EditOutlined /> : <EyeOutlined />}
        aria-pressed={preview}
        title={
          preview
            ? `Back to editing (Esc or ${PREVIEW_KEY})`
            : `See the page as users will (${PREVIEW_KEY})`
        }
        onClick={() => setPreviewMode(!preview)}
      >
        {preview ? 'Exit preview' : 'Preview'}
      </Button>
    </Flex>
  );
}
