export type ScreenOverlay = {
    id: string;
    source: CanvasImageSource;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    opacity?: number;
};
export type NormalizedOverlay = Omit<ScreenOverlay, 'source' | 'x' | 'y' | 'width' | 'height' | 'zIndex'> & {
    source: CanvasImageSource;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
};
export declare function normalizedOverlay(overlay: NormalizedOverlay, width: number, height: number, zIndex?: number): ScreenOverlay;
export declare class OverlayCompositor {
    readonly canvas: HTMLCanvasElement;
    resize(width: number, height: number): void;
    compose(source: HTMLCanvasElement, overlays: readonly ScreenOverlay[]): boolean;
}
//# sourceMappingURL=overlays.d.ts.map