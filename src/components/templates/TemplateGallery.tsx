'use client';

import { AppstoreOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Flex, Modal, Row, Tag, Typography, theme } from 'antd';
import { useState } from 'react';
import { hasWork } from '@/components/project/startOver';
import { useEditorStore } from '@/lib/editor/store';
import { type PageTemplate, templateCategoryLabels, templates } from '@/lib/templates';

function TemplateCard({ template, onUse }: { template: PageTemplate; onUse: () => void }) {
  const { token } = theme.useToken();
  const sources = template.data?.map((sample) => sample.name) ?? [];
  return (
    <Card
      size="small"
      title={template.label}
      extra={<Tag>{templateCategoryLabels[template.category]}</Tag>}
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: token.marginXS } }}
      aria-label={template.label}
      role="group"
    >
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        {template.description}
      </Typography.Paragraph>
      {sources.length > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          Mock data: {sources.join(', ')}
        </Typography.Text>
      )}
      <Button type="primary" onClick={onUse} aria-label={`Use ${template.label}`}>
        Use template
      </Button>
    </Card>
  );
}

/** Header button opening the list of page templates to start a project from. */
export function TemplateGallery() {
  const { message, modal } = App.useApp();
  const [open, setOpen] = useState(false);

  const start = (template: PageTemplate) => {
    useEditorStore.getState().loadTemplate(template.id);
    setOpen(false);
    message.success(`Started from the ${template.label} template`);
  };

  const use = (template: PageTemplate) => {
    const state = useEditorStore.getState();
    if (!hasWork(state)) {
      start(template);
      return;
    }
    modal.confirm({
      title: `Start from the ${template.label} template?`,
      content: `"${state.name}" will be replaced, and its versions and undo history will be gone. Save it first to keep a copy. Your saved blocks stay.`,
      okText: 'Use template',
      okButtonProps: { danger: true },
      onOk: () => start(template),
    });
  };

  return (
    <>
      <Button icon={<AppstoreOutlined />} onClick={() => setOpen(true)}>
        Templates
      </Button>
      <Modal
        title="Start from a template"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={880}
        destroyOnHidden
      >
        <Flex vertical gap="middle">
          <Typography.Text type="secondary">
            A whole page with its theme and sample data, ready to edit. It replaces the current
            project.
          </Typography.Text>
          <Row gutter={[16, 16]} aria-label="Page templates" role="list">
            {templates.map((template) => (
              <Col key={template.id} xs={24} sm={12} lg={8} role="listitem">
                <TemplateCard template={template} onUse={() => use(template)} />
              </Col>
            ))}
          </Row>
        </Flex>
      </Modal>
    </>
  );
}
