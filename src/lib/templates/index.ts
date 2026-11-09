import { createDataSource } from '@/lib/mockData';
import { createTheme, themePresets } from '@/lib/theme';
import { createRoot } from '@/lib/tree';
import { signIn, signUp } from './pages/auth';
import { crudList } from './pages/crudList';
import { dashboard } from './pages/dashboard';
import { landing } from './pages/landing';
import type { PageTemplate, SourceLookup, TemplateContent } from './types';

export * from './types';

export const templates: readonly PageTemplate[] = [dashboard, crudList, landing, signIn, signUp];

export function getTemplate(id: string): PageTemplate | undefined {
  return templates.find((template) => template.id === id);
}

/** The project content for a template: fresh ids, its own copy of the data and theme. */
export function instantiateTemplate(template: PageTemplate): TemplateContent {
  const mockData = (template.data ?? []).map((sample) =>
    createDataSource(sample.name, structuredClone(sample.data)),
  );
  const source: SourceLookup = (name) => {
    const found = mockData.find((candidate) => candidate.name === name);
    if (!found) throw new Error(`Template ${template.id} has no data source "${name}"`);
    return found.id;
  };
  const preset = themePresets.find((candidate) => candidate.id === template.preset);
  return {
    name: template.label,
    root: { ...createRoot(), children: template.build(source) },
    theme: structuredClone(preset?.theme ?? createTheme()),
    mockData,
  };
}
