import { type CRTSettings } from './CRTFilter.js';
import { OverlayCompositor, type ScreenOverlay } from './overlays.js';
export declare class VirtualScreenRenderer {
    readonly output: HTMLCanvasElement;
    readonly compositor: OverlayCompositor;
    private filter;
    constructor(output: HTMLCanvasElement, crtEnabled?: boolean);
    render(source: HTMLCanvasElement, settings: CRTSettings, overlays?: readonly ScreenOverlay[], sourceChanged?: boolean): void;
    isValid(): boolean;
    restartBreathing(): void;
    clearPersistence(): void;
    startChannelSwitch(): void;
    dispose(): void;
}
//# sourceMappingURL=VirtualScreenRenderer.d.ts.map