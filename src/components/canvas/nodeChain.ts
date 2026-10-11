export const NODE_ID_ATTR = 'data-node-id';

/** Canvas node ids under a viewport point, innermost first. */
export function nodeChainAt(x: number, y: number): string[] {
  for (const element of document.elementsFromPoint(x, y)) {
    let current = element.closest(`[${NODE_ID_ATTR}]`);
    if (!current) continue;

    const chain: string[] = [];
    while (current) {
      chain.push(current.getAttribute(NODE_ID_ATTR)!);
      current = current.parentElement?.closest(`[${NODE_ID_ATTR}]`) ?? null;
    }
    return chain;
  }
  return [];
}
