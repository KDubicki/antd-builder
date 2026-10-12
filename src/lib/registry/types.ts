/** How a prop is edited in the inspector and validated. */
export type PropDefinition =
  | { type: 'string'; label: string; multiline?: boolean }
  | { type: 'number'; label: string; min?: number; max?: number }
  /** `default` is antd's own default, when it isn't `false`; matching values are left unset. */
  | { type: 'boolean'; label: string; default?: boolean }
  | { type: 'enum'; label: string; options: readonly (string | number)[] }
  /** Structured data (items, options, columns…), edited as JSON. */
  | { type: 'json'; label: string };

/**
 * A prop that holds code rather than data, such as a render function. It isn't editable: the
 * canvas renders `value` and the export writes `source` as the JSX expression.
 */
export interface CodeProp {
  source: string;
  value: unknown;
}

/**
 * Which children a component accepts on the canvas:
 * - `none`: a leaf (its content comes from props, e.g. `children` text)
 * - `any`: any component that doesn't require a specific parent
 * - a list: only these components
 */
export type ChildrenRule = 'none' | 'any' | readonly string[];

export type ComponentCategory =
  | 'layout'
  | 'general'
  | 'typography'
  | 'navigation'
  | 'data-entry'
  | 'data-display'
  | 'feedback'
  | 'other';

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
  /** Upper bound on child nodes, e.g. 1 for wrappers like Tooltip that need a single child. */
  maxChildren?: number;
  /** antd's types require `children`, so an empty node is exported as `<X>{null}</X>`. */
  childrenRequired?: boolean;
  /** Components a new node starts with, e.g. two panels in a Splitter. */
  defaultChildren?: readonly string[];
  /** Props that hold code; see `CodeProp`. */
  codeProps?: Readonly<Record<string, CodeProp>>;
}
