import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CRT_SETTINGS } from '../src/core/defaults';
import { VirtualScreenRenderer } from '../src/core/VirtualScreenRenderer';

describe('VirtualScreenRenderer', () => {
  it('rolls the pass-through image during a channel switch', () => {
    const context = { imageSmoothingEnabled: true, clearRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const output = document.createElement('canvas'); output.width = 100; output.height = 80;
    const screen = new VirtualScreenRenderer(output, false);
    const source = document.createElement('canvas'); source.width = 100; source.height = 80;
    vi.spyOn(performance, 'now').mockReturnValue(100);
    screen.startChannelSwitch();
    vi.spyOn(performance, 'now').mockReturnValue(310);
    screen.render(source, DEFAULT_CRT_SETTINGS);
    expect(context.drawImage).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), 0, expect.any(Number), 100, 80);
    expect(context.drawImage.mock.calls.at(-1)?.[2]).toBeLessThan(0);
    expect(screen.isChannelSwitchAnimating()).toBe(true);
  });
});
