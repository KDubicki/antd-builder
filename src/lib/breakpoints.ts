/** antd's grid breakpoints and their minimum widths (px), smallest first. */
export const BREAKPOINTS = [
  ['xs', 0],
  ['sm', 576],
  ['md', 768],
  ['lg', 992],
  ['xl', 1200],
  ['xxl', 1600],
] as const;

export type Breakpoint = (typeof BREAKPOINTS)[number][0];

const BREAKPOINT_KEYS = new Set<string>(BREAKPOINTS.map(([key]) => key));

/**
 * Col props as antd's CSS would apply them at `width`: the span of the largest breakpoint that
 * is set and active (`xs` always is), else `span`. antd matches breakpoints with media queries
 * on the window, so the canvas uses this to preview device widths it is only pretending to be.
 * Breakpoint props are removed from the result.
 */
export function colPropsAt(
  props: Readonly<Record<string, unknown>>,
  width: number,
): Record<string, unknown> {
  const rest = Object.fromEntries(
    Object.entries(props).filter(([key]) => !BREAKPOINT_KEYS.has(key)),
  );
  let span = props.span;
  for (const [key, min] of BREAKPOINTS) {
    if (width >= min && typeof props[key] === 'number') span = props[key];
  }
  return span === undefined ? rest : { ...rest, span };
}
