import type { Terminal } from '@xterm/xterm';
import type { CRTSettings } from '../core/CRTFilter.js';
import { type TerminalColorProfile } from '../core/color-profiles.js';
export type CopyPoint = {
    row: number;
    column: number;
};
export type CopySelection = {
    start: CopyPoint;
    end: CopyPoint;
};
export type TextHighlightRange = {
    line: number;
    startColumn: number;
    endColumn: number;
};
export type TerminalScrollRegion = {
    deltaRows: number;
    topRow: number;
    bottomRow: number;
};
type LumaFrame = {
    width: number;
    height: number;
    cellWidth: number;
    cellHeight: number;
    padding: number;
};
export declare function terminalPadding(width: number, height: number): number;
export declare function canvasFont(fontSize: number, family: string, fallbackFont?: string): string;
export declare function loadCanvasFont(family: string, bytes: number[]): Promise<void>;
export declare function canvasFontLoad(family: string, load?: () => Promise<number[] | null>): Promise<void> | undefined;
export declare function fontCellSize(fontSize: number, family: string, context?: CanvasRenderingContext2D, widthAdjustment?: number, heightAdjustment?: number, fallbackFont?: string): {
    width: number;
    height: number;
};
export declare function terminalDimensions(width: number, height: number, fontSize: number, family: string, widthAdjustment?: number, heightAdjustment?: number, fallbackFont?: string): {
    cols: number;
    rows: number;
};
export declare function terminalContentOffset(width: number, height: number, cols: number, rows: number, cell: {
    width: number;
    height: number;
}): {
    x: number;
    y: number;
};
export declare function accessibleTextColor(foreground: string, background: string): string;
export declare function terminalAverageLuma(terminal: Terminal, profile: TerminalColorProfile, frame?: LumaFrame): number;
export declare class TerminalRenderer {
    readonly sourceCanvas: HTMLCanvasElement;
    readonly compositedCanvas: HTMLCanvasElement;
    private readonly scrollFromCanvas;
    private readonly scrollTargetCanvas;
    private readonly scrollFrameCanvas;
    private terminal;
    private selection;
    private textHighlights;
    private textHighlightsByLine;
    private activeTextHighlight;
    private dirty;
    private fullDirty;
    private focused;
    private rowSignatures;
    private snapshotBuffer;
    private cursorRow;
    private disposables;
    private sourceLuma;
    private hasMeasuredSourceLuma;
    private lastCursorPhase;
    private lastCursorMoveTime;
    private lastCursorX;
    private lastCursorY;
    private cursorMoved;
    private scrollTransition;
    private scrollTargetReady;
    private scrollStarted;
    private scrollCellHeight;
    private scrollContentTop;
    bindTerminal(terminal: Terminal | null, onScroll?: (viewportY: number) => void): void;
    resizeSource(width: number, height: number): boolean;
    beginBufferScroll(fromViewportY: number, toViewportY: number): boolean;
    beginRegionScroll(region: TerminalScrollRegion): boolean;
    private scrollDuration;
    private scrollProgress;
    private scrollPosition;
    private retargetScroll;
    private canRetargetScroll;
    private startScroll;
    cancelScroll(): void;
    consumeScrollStart(): boolean;
    get isScrollAnimating(): boolean;
    sourcePointAt(clientX: number, clientY: number, output: HTMLCanvasElement, settings: CRTSettings): {
        x: number;
        y: number;
    } | null;
    setFocused(focused: boolean): void;
    markDirty(): void;
    private markTerminalDirty;
    private markCursorMoved;
    isCursorBlinkActive(): boolean;
    getCursorBlinkPhase(time: number): number;
    isCursorVisibleAt(time: number, buffer: {
        viewportY: number;
        baseY: number;
        cursorX: number;
        cursorY: number;
    }, isCursorHidden: boolean): boolean;
    get averageLuma(): number;
    get hasMeasuredLuma(): boolean;
    setSelection(selection: CopySelection | null): void;
    setTextHighlights(ranges: readonly TextHighlightRange[], activeIndex?: number): void;
    cellAtPoint(clientX: number, clientY: number, output: HTMLCanvasElement, settings: CRTSettings): {
        col: number;
        row: number;
    } | null;
    draw(time: number, settings: CRTSettings): boolean;
    private composeTerminal;
    private drawCursor;
    private renderScroll;
    private lineHeight;
    private rowSignature;
    private drawRow;
    dispose(): void;
}
export {};
//# sourceMappingURL=TerminalRenderer.d.ts.map