import { describe, expect, it } from 'vitest';
import { binarizeTextPixels } from '../src/terminal/TerminalRenderer';

describe('binarizeTextPixels', () => {
  it('replaces only glyph pixels whose coverage reaches the threshold', () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    const mask = new Uint8ClampedArray([200, 210, 220, 127, 70, 80, 90, 128]);

    binarizeTextPixels(pixels, mask);

    expect([...pixels]).toEqual([10, 20, 30, 255, 70, 80, 90, 255]);
  });
});
