import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import type { ComponentType } from 'react';

type AnyProps = Record<string, unknown>;

/** Maps registry component names to the antd components rendered on the canvas. */
export const renderers: Readonly<Record<string, ComponentType<AnyProps>>> = {
  Flex,
  Space,
  Row,
  Col,
  Card,
  Divider,
  Button,
  'Typography.Title': Typography.Title,
  'Typography.Paragraph': Typography.Paragraph,
  'Typography.Text': Typography.Text,
  Form,
  'Form.Item': Form.Item,
  Input,
  InputNumber,
  Checkbox,
  Switch,
  Alert,
  Tag,
} as Record<string, ComponentType<AnyProps>>;
