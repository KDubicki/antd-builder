import { afterEach, describe, expect, it, vi } from 'vitest';
import { nodeChainAt } from './nodeChain';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// jsdom has no layout, so `elementsFromPoint` is stubbed with the elements "under" the pointer.
const stubElementsAt = (...elements: Element[]) => {
  document.elementsFromPoint = vi.fn(() => elements);
};

describe('nodeChainAt', () => {
  it('returns the node ids around the topmost hit, innermost first', () => {
    document.body.innerHTML = `
      <div data-node-id="root"><div data-node-id="card"><span><button id="b">x</button></span></div></div>
      <div id="overlay"></div>`;
    stubElementsAt(document.getElementById('overlay')!, document.getElementById('b')!);
    expect(nodeChainAt(0, 0)).toEqual(['card', 'root']);
  });

  it('returns an empty chain when no canvas node is under the pointer', () => {
    document.body.innerHTML = '<div id="outside"></div>';
    stubElementsAt(document.getElementById('outside')!);
    expect(nodeChainAt(0, 0)).toEqual([]);
  });
});
