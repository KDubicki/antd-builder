'use client';

import { useDraggable } from '@dnd-kit/core';
import { Flex, Typography, theme } from 'antd';
import type { DragData } from '@/lib/editor/drop';
import { type ComponentMeta, categoryLabels, components } from '@/lib/registry';

function PaletteItem({ meta }: { meta: ComponentMeta }) {
  const { token } = theme.useToken();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${meta.name}`,
    data: { type: 'palette', component: meta.name } satisfies DragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={meta.description}
      style={{
        padding: `${token.paddingXXS}px ${token.paddingSM}px`,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        background: token.colorBgContainer,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {meta.label}
    </div>
  );
}

const categories = Object.keys(categoryLabels) as (keyof typeof categoryLabels)[];

export function Palette() {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap="middle" style={{ padding: token.padding }} aria-label="Component palette">
      {categories.map((category) => (
        <Flex key={category} vertical gap="small">
          <Typography.Text type="secondary" strong>
            {categoryLabels[category]}
          </Typography.Text>
          {components
            .filter((meta) => meta.category === category)
            .map((meta) => (
              <PaletteItem key={meta.name} meta={meta} />
            ))}
        </Flex>
      ))}
    </Flex>
  );
}
