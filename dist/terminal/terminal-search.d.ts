import type { Terminal } from '@xterm/xterm';
export type TerminalSearchMatch = {
    line: number;
    startColumn: number;
    endColumn: number;
};
export type TerminalSearchSnapshot = {
    matches: TerminalSearchMatch[];
    buffer: 'normal' | 'alternate';
};
export declare function findTerminalMatches(terminal: Terminal, query: string): TerminalSearchSnapshot;
export declare function nextSearchIndex(current: number, count: number, direction: 1 | -1): number;
//# sourceMappingURL=terminal-search.d.ts.map