import { describe, expect, it } from 'vitest';
import { TerminalRenderer } from '../src/terminal/TerminalRenderer';

describe('TerminalRenderer lifecycle', () => {
  it('disposes every xterm subscription and accepts a fresh bind', () => {
    let disposed = 0;
    const subscription = () => ({ dispose: () => { disposed += 1; } });
    const terminal = { onCursorMove: subscription, onWriteParsed: subscription, onScroll: subscription };
    const renderer = new TerminalRenderer();
    renderer.bindTerminal(terminal as never);
    renderer.dispose();
    expect(disposed).toBe(3);
    renderer.bindTerminal(terminal as never);
    renderer.dispose();
    expect(disposed).toBe(6);
  });
});
