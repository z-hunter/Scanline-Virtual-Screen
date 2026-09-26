import { CRTFilter } from './CRTFilter.js';
import { OverlayCompositor } from './overlays.js';
export class VirtualScreenRenderer {
    output;
    compositor = new OverlayCompositor();
    filter = null;
    constructor(output, crtEnabled = true) {
        this.output = output;
        if (crtEnabled)
            this.filter = new CRTFilter(output);
    }
    render(source, settings, overlays = [], sourceChanged = true) {
        this.compositor.compose(source, overlays);
        if (this.filter?.isValid())
            this.filter.render(this.compositor.canvas, settings, sourceChanged);
        else {
            const ctx = this.output.getContext('2d');
            if (!ctx)
                return;
            ctx.imageSmoothingEnabled = settings.pixelSmoothing !== false;
            ctx.drawImage(this.compositor.canvas, 0, 0, this.output.width, this.output.height);
        }
    }
    isValid() { return this.filter?.isValid() ?? true; }
    restartBreathing() { this.filter?.restartBreathing(); }
    clearPersistence() { this.filter?.clearPersistence(); }
    startChannelSwitch() { this.filter?.startChannelSwitch(); }
    dispose() { this.filter?.dispose(); this.filter = null; }
}
//# sourceMappingURL=VirtualScreenRenderer.js.map