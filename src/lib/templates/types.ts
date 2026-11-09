import type { BuilderNode, DataSource, ProjectTheme } from '@/lib/schema';

export type TemplateCategory = 'app' | 'marketing' | 'account' | 'content' | 'status';

export const templateCategoryLabels: Readonly<Record<TemplateCategory, string>> = {
  app: 'Apps & dashboards',
  marketing: 'Marketing',
  account: 'Account',
  content: 'Content & shop',
  status: 'Status pages',
};

export type SampleData = Pick<DataSource, 'name' | 'data'>;

/** Looks up a data source's id by its name while a template builds its tree. */
export type SourceLookup = (name: string) => string;

/** A whole page to start a project from: its tree, theme and the mock data it reads. */
export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  /** Id of the theme preset the page starts with (antd's default when unset). */
  preset?: string;
  /** Mock data the page reads, by name. */
  data?: readonly SampleData[];
  /** Builds the page's top-level nodes, with fresh ids. */
  build: (source: SourceLookup) => BuilderNode[];
}

/** What a template turns into: everything a project needs besides blocks and versions. */
export interface TemplateContent {
  name: string;
  root: BuilderNode;
  theme: ProjectTheme;
  mockData: DataSource[];
}
