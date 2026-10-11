/** How a prop is edited in the inspector and validated. */
export type PropDefinition =
  | { type: 'string'; label: string; multiline?: boolean }
  | { type: 'number'; label: string; min?: number; max?: number }
  | { type: 'boolean'; label: string }
  | { type: 'enum'; label: string; options: readonly (string | number)[] };

/**
 * Which children a component accepts on the canvas:
 * - `none`: a leaf (its content comes from props, e.g. `children` text)
 * - `any`: any component that doesn't require a specific parent
 * - a list: only these components
 */
export type ChildrenRule = 'none' | 'any' | readonly string[];

export type ComponentCategory = 'layout' | 'general' | 'typography' | 'data-entry' | 'feedback';

export interface ComponentMeta {
  /** antd component name, as written in JSX (e.g. "Form.Item"). */
  name: string;
  label: string;
  category: ComponentCategory;
  description: string;
  props: Readonly<Record<string, PropDefinition>>;
  defaultProps: Readonly<Record<string, unknown>>;
  children: ChildrenRule;
  /** If set, the component may only be placed inside one of these components. */
  parents?: readonly string[];
}
