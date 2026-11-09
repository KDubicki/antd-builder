'use client';

import { AppstoreOutlined, LinkOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Modal,
  Row,
  Segmented,
  Tag,
  Typography,
  theme,
} from 'antd';
import { useState } from 'react';
import {
  type PageTemplate,
  type TemplateCategory,
  findTemplates,
  templateCategoryLabels,
  usedCategories,
} from '@/lib/templates';
import { TemplatePreview } from './TemplatePreview';
import { useTemplateActions } from './templateActions';

const ALL = 'all';

interface CardActions {
  onUse: (template: PageTemplate) => void;
  onAdd: (template: PageTemplate) => void;
  onCopyLink: (template: PageTemplate) => void;
}

function TemplateCard({
  template,
  onUse,
  onAdd,
  onCopyLink,
}: CardActions & { template: PageTemplate }) {
  const { token } = theme.useToken();
  const sources = template.data?.map((sample) => sample.name) ?? [];
  return (
    <Card
      size="small"
      title={template.label}
      extra={<Tag>{templateCategoryLabels[template.category]}</Tag>}
      cover={<TemplatePreview template={template} />}
      style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: token.marginXS, flex: 1 } }}
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
      <Flex gap="small" style={{ marginTop: 'auto' }}>
        <Button
          type="primary"
          onClick={() => onUse(template)}
          aria-label={`Use ${template.label}`}
          style={{ flex: 1 }}
        >
          Use template
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={() => onAdd(template)}
          aria-label={`Add ${template.label} to page`}
          title="Add to the current page"
        />
        <Button
          icon={<LinkOutlined />}
          onClick={() => onCopyLink(template)}
          aria-label={`Copy link to ${template.label}`}
          title="Copy a link that opens this template"
        />
      </Flex>
    </Card>
  );
}

/** Search, category filter and the matching templates. */
function TemplateBrowser(actions: CardActions) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | typeof ALL>(ALL);
  const matching = findTemplates(query, category === ALL ? null : category);
  const count = (of: TemplateCategory | null) => findTemplates('', of).length;

  return (
    <Flex vertical gap="middle">
      <Typography.Text type="secondary">
        A whole page with its theme and sample data, ready to edit. Use one to start over, or add it
        below the current page.
      </Typography.Text>
      <Input
        allowClear
        autoFocus
        prefix={<SearchOutlined />}
        placeholder="Search templates"
        aria-label="Search templates"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Segmented<TemplateCategory | typeof ALL>
        aria-label="Template categories"
        value={category}
        onChange={setCategory}
        style={{ alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}
        options={[
          { value: ALL, label: `All (${count(null)})` },
          ...usedCategories().map((value) => ({
            value,
            label: `${templateCategoryLabels[value]} (${count(value)})`,
          })),
        ]}
      />
      {matching.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No templates match" />
      ) : (
        <Row gutter={[16, 16]} aria-label="Page templates" role="list">
          {matching.map((template) => (
            <Col
              key={template.id}
              xs={24}
              sm={12}
              lg={8}
              role="listitem"
              style={{ display: 'flex' }}
            >
              <TemplateCard template={template} {...actions} />
            </Col>
          ))}
        </Row>
      )}
    </Flex>
  );
}

/** Header button opening the list of page templates to start a project from. */
export function TemplateGallery() {
  const { start, add, copyLink } = useTemplateActions();
  const [open, setOpen] = useState(false);
  // Each opening gets a fresh browser: no search or category left over from last time.
  const [openings, setOpenings] = useState(0);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        icon={<AppstoreOutlined />}
        onClick={() => {
          setOpenings((count) => count + 1);
          setOpen(true);
        }}
      >
        Templates
      </Button>
      <Modal title="Page templates" open={open} onCancel={close} footer={null} width={880}>
        <TemplateBrowser
          key={openings}
          onUse={(template) => start(template, close)}
          onAdd={(template) => {
            add(template);
            close();
          }}
          onCopyLink={copyLink}
        />
      </Modal>
    </>
  );
}
